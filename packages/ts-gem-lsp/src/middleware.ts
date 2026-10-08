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

import { findClassNameAt, findClassNameSelectors, findClassNameUsages, findElementsUsingStyle } from './class-names';
import type { GemConfiguration } from './configuration';
import { defaultConfiguration } from './configuration';
import { CssService } from './css';
import {
  getAttrFormatFixes,
  getElementClassDiagnostics,
  getHtmlDiagnostics,
  isUnusedDecoratedDiagnostic,
} from './diagnostics';
import { ElementDefineRules, ElementIndex } from './elements';
import { HtmlService } from './html';
import { getClassMapKeys } from './styles';
import { findTagAt, findTagLocations, toTextEdits } from './tags';
import { findTemplate, findTemplates, toOffset } from './template';
import { getNeverMembers, getThemeKeys } from './theme';
import type { GemCompletionData } from './translate';

// 宿主无关：VS Code 中间件、LSP 代理都调用同一份变换
export type Transformer<P, R> = (result: R, context: { readonly params: P }) => Promise<R>;

export interface GemMiddleware {
  'textDocument/hover': Transformer<HoverParams, Hover | null>;
  'textDocument/completion': Transformer<CompletionParams, CompletionResult>;
  'completionItem/resolve': Transformer<CompletionItem, CompletionItem>;
  'textDocument/diagnostic': Transformer<DocumentDiagnosticParams, DocumentDiagnosticReport>;
  'textDocument/codeAction': Transformer<CodeActionParams, (Command | CodeAction)[] | null>;
  'textDocument/definition': Transformer<DefinitionParams, Definition | LocationLink[] | null>;
  'textDocument/references': Transformer<ReferenceParams, Location[] | null>;
  'textDocument/prepareRename': Transformer<PrepareRenameParams, PrepareRenameResult | null>;
  'textDocument/rename': Transformer<RenameParams, WorkspaceEdit | null>;
}

const ENUM_MEMBER_KIND = 20 as CompletionItem['kind'];

type CompletionResult = CompletionList | CompletionItem[] | null;

export function createGemMiddleware(
  getApi: () => Promise<API<true>>,
  getConfig: () => GemConfiguration = () => defaultConfiguration,
): GemMiddleware {
  let rules: { key: string; value: ElementDefineRules } | undefined;
  const getRules = () => {
    const config = getConfig().elementDefineRules;
    const key = JSON.stringify(config);
    if (rules?.key !== key) rules = { key, value: new ElementDefineRules(config) };
    return rules.value;
  };
  const index = new ElementIndex(getRules);
  const css = new CssService(getConfig);
  const html = new HtmlService(index, css, getConfig);

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

  /** 模板之外的补全：`classMap` 的键、主题的键，过滤值为 `never` 的成员 */
  async function getScriptCompletion(uri: string, position: Position, result: CompletionResult) {
    const ctx = await getFileContext(uri);
    if (!ctx) return result;
    const { project, file } = ctx;
    const offset = toOffset(file.text, position);
    const keys = (await getClassMapKeys(project, file, offset, css)) ?? (await getThemeKeys(project, file, offset));
    // 和 ts-gem-plugin 一致，只提供这些键
    if (keys?.length) {
      return { isIncomplete: false, items: keys.map((label) => ({ label, kind: ENUM_MEMBER_KIND, sortText: '' })) };
    }
    const items = Array.isArray(result) ? result : result?.items;
    const never = items?.length ? await getNeverMembers(project, file, offset) : undefined;
    if (!never?.size || !result) return result;
    const filter = (list: CompletionItem[]) => list.filter((item) => !never.has(item.label));
    return Array.isArray(result) ? filter(result) : { ...result, items: filter(result.items) };
  }

  /** 类名的定义（样式中的选择器）和使用的地方 */
  async function getClassNameReferences(uri: string, position: Position) {
    const ctx = await getFileContext(uri);
    if (!ctx) return;
    const { project, file } = ctx;
    const offset = toOffset(file.text, position);
    const className = findClassNameAt(file, offset);
    if (className) {
      const { element, name } = className;
      return [
        ...(await findClassNameSelectors(project, element, name, css)),
        ...findClassNameUsages(element).filter((usage) => usage.name === name),
      ];
    }
    const template = findTemplate(file, offset);
    const selector = template?.kind === 'css' && css.selectorAt(template, offset);
    if (!template || !selector) return;
    const elements = await findElementsUsingStyle(project, template, index);
    const selectors = await Promise.all(elements.map((e) => findClassNameSelectors(project, e, selector.name, css)));
    const usages = elements.flatMap((e) => findClassNameUsages(e).filter((usage) => usage.name === selector.name));
    // 多个元素使用同一个样式时选择器会重复
    const unique = new Map([...selectors.flat(), ...usages].map((l) => [JSON.stringify([l.uri, l.range]), l]));
    return [...unique.values()];
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
      if (!ctx) return result;
      const { project, template, offset } = ctx;
      const hover =
        template.kind === 'html' ? await html.hover(project, template, offset) : css.hover(template, offset);
      return (hover as Hover | null) ?? result;
    },
    'textDocument/completion': async (result, { params }) => {
      const ctx = await getTemplateContext(params.textDocument.uri, params.position);
      if (!ctx) return getScriptCompletion(params.textDocument.uri, params.position, result);
      const { project, template, offset } = ctx;
      const list =
        template.kind === 'html'
          ? await html.complete(project, template, offset)
          : css.complete(template, offset, [...(await index.get(project)).keys()]);
      return list as CompletionList;
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
        ? await getHtmlDiagnostics(project, file, templates, await index.get(project), getConfig().strict)
        : [];
      const cssDocuments = [...findTemplates(file, 'css'), ...templates.flatMap((t) => html.styles(t))];
      return {
        ...result,
        items: [
          ...result.items.filter((d) => !isUnusedDecoratedDiagnostic(file, d)),
          ...getElementClassDiagnostics(file, getConfig().strict),
          ...htmlDiagnostics,
          ...cssDocuments.flatMap((doc) => css.diagnostics(doc)),
        ],
      };
    },
    'textDocument/definition': async (result, { params }) => {
      const fileCtx = await getFileContext(params.textDocument.uri);
      const className = fileCtx && findClassNameAt(fileCtx.file, toOffset(fileCtx.file.text, params.position));
      if (fileCtx && className) {
        const selectors = await findClassNameSelectors(fileCtx.project, className.element, className.name, css);
        return selectors.map(({ uri, range }) => ({
          originSelectionRange: className.range,
          targetUri: uri,
          targetRange: range,
          targetSelectionRange: range,
        }));
      }
      const ctx = await getTemplateContext(params.textDocument.uri, params.position);
      if (ctx?.template.kind !== 'html') return result;
      return (await html.definition(ctx.project, ctx.template, ctx.offset)) ?? result;
    },
    'textDocument/references': async (result, { params }) => {
      const ctx = await getTagContext(params.textDocument.uri, params.position);
      if (ctx) return findTagLocations(ctx.project, ctx.info.tag);
      return (await getClassNameReferences(params.textDocument.uri, params.position)) ?? result;
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
