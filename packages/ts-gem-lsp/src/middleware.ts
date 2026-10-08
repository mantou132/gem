import type { API } from 'typescript/unstable/async';
import type {
  CodeAction,
  CodeActionParams,
  Command,
  CompletionItem,
  CompletionList,
  CompletionParams,
  Definition,
  DefinitionParams,
  DocumentDiagnosticParams,
  DocumentDiagnosticReport,
  Hover,
  HoverParams,
  Location,
  LocationLink,
  Position,
  PrepareRenameParams,
  PrepareRenameResult,
  ReferenceParams,
  RenameParams,
  WorkspaceEdit,
} from 'typescript/unstable/vscode';

import {
  getAttrFormatFixes,
  getElementClassDiagnostics,
  getHtmlDiagnostics,
  isUnusedDecoratedDiagnostic,
} from './diagnostics';
import { ElementDefineRules, ElementIndex } from './elements';
import { type GemCompletionData, HtmlService } from './html';
import { findTagAt, findTagLocations, toTextEdits } from './tags';
import { findTemplate, findTemplates, toOffset } from './template';

// 宿主无关：VS Code 中间件、LSP 代理都调用同一份变换
export type Transformer<P, R> = (result: R, context: { readonly params: P }) => Promise<R>;

export interface GemMiddleware {
  'textDocument/hover': Transformer<HoverParams, Hover | null>;
  'textDocument/completion': Transformer<CompletionParams, CompletionList | CompletionItem[] | null>;
  'completionItem/resolve': Transformer<CompletionItem, CompletionItem>;
  'textDocument/diagnostic': Transformer<DocumentDiagnosticParams, DocumentDiagnosticReport>;
  'textDocument/codeAction': Transformer<CodeActionParams, (Command | CodeAction)[] | null>;
  'textDocument/definition': Transformer<DefinitionParams, Definition | LocationLink[] | null>;
  'textDocument/references': Transformer<ReferenceParams, Location[] | null>;
  'textDocument/prepareRename': Transformer<PrepareRenameParams, PrepareRenameResult | null>;
  'textDocument/rename': Transformer<RenameParams, WorkspaceEdit | null>;
}

export function createGemMiddleware(getApi: () => Promise<API<true>>): GemMiddleware {
  const index = new ElementIndex(new ElementDefineRules());
  const html = new HtmlService(index);

  async function getFileContext(uri: string) {
    const snapshot = await (await getApi()).getCurrentLanguageServerSnapshot();
    const project = await snapshot.getDefaultProjectForFile({ uri });
    const file = await project?.program.getSourceFile({ uri });
    return project && file && { project, file };
  }

  async function getTagContext(uri: string, position: Position) {
    const ctx = await getFileContext(uri);
    const info = ctx && findTagAt(ctx.file, toOffset(ctx.file.text, position));
    return info && { ...ctx, info };
  }

  async function getTemplateContext(uri: string, position: Position) {
    const ctx = await getFileContext(uri);
    if (!ctx) return;
    const { project, file } = ctx;
    const offset = toOffset(file.text, position);
    const template = findTemplate(file, offset);
    return template && { project, template, offset };
  }

  return {
    'textDocument/hover': async (result, { params }) => {
      const ctx = await getTemplateContext(params.textDocument.uri, params.position);
      if (ctx?.template.kind !== 'html') return result;
      return ((await html.hover(ctx.project, ctx.template, ctx.offset)) as Hover | null) ?? result;
    },
    'textDocument/completion': async (result, { params }) => {
      const ctx = await getTemplateContext(params.textDocument.uri, params.position);
      if (ctx?.template.kind !== 'html') return result;
      return (await html.complete(ctx.project, ctx.template, ctx.offset)) as CompletionList;
    },
    // Gem 补全项已包含文档，TypeScript 不认识这些补全项
    'completionItem/resolve': async (result, { params }) => {
      return (params.data as GemCompletionData | undefined)?.gem ? params : result;
    },
    // 未变化的报告无法修改，依赖 TypeScript 在文件变化时返回完整报告
    'textDocument/diagnostic': async (result, { params }) => {
      if (result.kind !== 'full') return result;
      const ctx = await getFileContext(params.textDocument.uri);
      if (!ctx) return result;
      const { project, file } = ctx;
      const templates = findTemplates(file, 'html');
      const htmlDiagnostics = templates.length
        ? await getHtmlDiagnostics(project, file, templates, await index.get(project))
        : [];
      return {
        ...result,
        items: [
          ...result.items.filter((d) => !isUnusedDecoratedDiagnostic(file, d)),
          ...getElementClassDiagnostics(file),
          ...htmlDiagnostics,
        ],
      };
    },
    'textDocument/definition': async (result, { params }) => {
      const ctx = await getTemplateContext(params.textDocument.uri, params.position);
      if (ctx?.template.kind !== 'html') return result;
      return (await html.definition(ctx.project, ctx.template, ctx.offset)) ?? result;
    },
    'textDocument/references': async (result, { params }) => {
      const ctx = await getTagContext(params.textDocument.uri, params.position);
      if (!ctx) return result;
      return findTagLocations(ctx.project, ctx.info.tag);
    },
    'textDocument/prepareRename': async (result, { params }) => {
      const ctx = await getTagContext(params.textDocument.uri, params.position);
      if (!ctx) return result;
      return { range: ctx.info.range, placeholder: ctx.info.tag };
    },
    // 在定义处重命名所有使用的地方，在模板中只重命名当前元素的开始和结束标签
    'textDocument/rename': async (result, { params }) => {
      const { textDocument, position, newName } = params;
      const ctx = await getTagContext(textDocument.uri, position);
      if (!ctx) return result;
      const { info } = ctx;
      const locations = info.isDefinition
        ? await findTagLocations(ctx.project, info.tag)
        : info.tagRanges!.map((range) => ({ uri: textDocument.uri, range }));
      return { changes: toTextEdits(locations, newName) };
    },
    'textDocument/codeAction': async (result, { params }) => {
      const fixes = getAttrFormatFixes(params.textDocument.uri, params.context.diagnostics);
      return fixes.length ? [...(result ?? []), ...fixes] : result;
    },
  };
}
