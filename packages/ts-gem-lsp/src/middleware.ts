import { kebabToCamelCase } from '@mantou/gem/lib/utils';
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
  DocumentHighlight,
  DocumentHighlightParams,
  FoldingRange,
  FoldingRangeParams,
  Hover,
  HoverParams,
  LinkedEditingRangeParams,
  LinkedEditingRanges,
  Location,
  LocationLink,
  Position,
  PrepareRenameParams,
  PrepareRenameResult,
  ReferenceParams,
  RenameParams,
  TextEdit,
  VSOnAutoInsertParams,
  VSOnAutoInsertResponseItem,
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
import { ElementDefineRules, ElementIndex, isDepFile, resolveElementType } from './elements';
import { HtmlService, toLocationLink } from './html';
import { findElementProp, findPropReferences, getPropRenameEdits } from './props';
import { getClassMapKeys } from './styles';
import { findTagAt, findTagLocations, toTextEdits } from './tags';
import { findTemplate, findTemplates, toOffset, toPosition } from './template';
import { getNeverMembers, getThemeKeys } from './theme';
import type { GemCompletionData } from './translate';
import { ts } from './ts';

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
  'textDocument/foldingRange': Transformer<FoldingRangeParams, FoldingRange[] | null>;
  'textDocument/documentHighlight': Transformer<DocumentHighlightParams, DocumentHighlight[] | null>;
  'textDocument/linkedEditingRange': Transformer<LinkedEditingRangeParams, LinkedEditingRanges | null>;
  'textDocument/_vs_onAutoInsert': Transformer<VSOnAutoInsertParams, VSOnAutoInsertResponseItem | null>;
}

const ENUM_MEMBER_KIND = 20 as CompletionItem['kind'];
const SNIPPET_FORMAT = 2 as VSOnAutoInsertResponseItem['_vs_textEditFormat'];

type CompletionResult = CompletionList | CompletionItem[] | null;

/** TypeScript 可能使用 `changes` 或 `documentChanges` */
function mergeWorkspaceEdit(edit: WorkspaceEdit, changes: Record<string, TextEdit[]>): WorkspaceEdit {
  if (edit.documentChanges) {
    const documentChanges = Object.entries(changes).map(([uri, edits]) => ({
      textDocument: { uri, version: null },
      edits,
    }));
    return { ...edit, documentChanges: [...edit.documentChanges, ...documentChanges] };
  }
  const merged = { ...edit.changes };
  for (const [uri, edits] of Object.entries(changes)) merged[uri] = [...(merged[uri] ?? []), ...edits];
  return { ...edit, changes: merged };
}

export interface GemService {
  middleware: GemMiddleware;
  /** 宿主在项目文件修改时调用，不传 URI 时全部重新扫描 */
  invalidate: (uri?: string) => void;
}

export function createGemMiddleware(
  getApi: () => Promise<API<true>>,
  getConfig: () => GemConfiguration = () => defaultConfiguration,
  /** 由宿主请求 TypeScript 重命名，提供时支持在模板中重命名属性 */
  renameDeclaration?: (params: RenameParams) => Promise<WorkspaceEdit | null>,
): GemService {
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
      // 带上 Gem 标记，解析补全项时不转给 TypeScript
      const items = keys.map((label) => ({
        label,
        kind: ENUM_MEMBER_KIND,
        sortText: '',
        data: {
          fileName: file.fileName,
          position: offset,
          name: `gem:${label}`,
          gem: true,
        } satisfies GemCompletionData,
      }));
      return { isIncomplete: false, items };
    }
    const items = Array.isArray(result) ? result : result?.items;
    const never = items?.length ? await getNeverMembers(project, file, offset) : undefined;
    if (!never?.size || !result) return result;
    const filter = (list: CompletionItem[]) => list.filter((item) => !never.has(item.label));
    return Array.isArray(result) ? filter(result) : { ...result, items: filter(result.items) };
  }

  /** 光标所在的样式文档：样式模板或 html 模板中的 `<style>` */
  async function getCssContext(uri: string, position: Position) {
    const ctx = await getTemplateContext(uri, position);
    if (!ctx) return;
    const { template, offset } = ctx;
    const vDoc = template.kind === 'css' ? template : html.styleAt(template, offset);
    return vDoc && { ...ctx, vDoc };
  }

  async function getCssDefinition(uri: string, position: Position): Promise<LocationLink[] | undefined> {
    const ctx = await getCssContext(uri, position);
    if (!ctx) return;
    const { project, template, vDoc, offset } = ctx;
    const selector = css.elementSelectorAt(vDoc, offset);
    if (selector) {
      const elementType = await resolveElementType(project, template.file, await index.get(project), selector.tag);
      const declaration = await elementType?.symbol?.declarations[0]?.resolve(project);
      return declaration ? [toLocationLink(selector.range, declaration)] : [];
    }
    const prop = css.customPropertyAt(vDoc, offset);
    if (!prop) return;
    return css.customPropertyLocations(vDoc, prop.name).declarations.map((range) => ({
      originSelectionRange: prop.range,
      targetUri: uri,
      targetRange: range,
      targetSelectionRange: range,
    }));
  }

  /** 字符串参数中的标签，例如 `createElement('my-tag')`，模板中的标签由 html 服务处理 */
  async function getStringTagDefinition(uri: string, position: Position): Promise<LocationLink[] | undefined> {
    const ctx = await getFileContext(uri);
    if (!ctx) return;
    const { project, file } = ctx;
    const offset = toOffset(file.text, position);
    const tag = !findTemplate(file, offset) && findTagAt(file, offset);
    if (!tag || tag.isDefinition) return;
    const elementType = await resolveElementType(project, file, await index.get(project), tag.tag);
    const declaration = await elementType?.symbol?.declarations[0]?.resolve(project);
    return declaration ? [toLocationLink(tag.range, declaration)] : [];
  }

  async function getCssReferences(uri: string, position: Position): Promise<Location[] | undefined> {
    const ctx = await getCssContext(uri, position);
    if (!ctx) return;
    const { project, vDoc, offset } = ctx;
    const selector = css.elementSelectorAt(vDoc, offset);
    if (selector) return findTagLocations(project, selector.tag, css);
    const prop = css.customPropertyAt(vDoc, offset);
    if (!prop) return;
    const { declarations, references } = css.customPropertyLocations(vDoc, prop.name);
    return [...declarations, ...references].map((range) => ({ uri, range }));
  }

  async function getPropContext(uri: string, position: Position) {
    const ctx = await getFileContext(uri);
    const prop = ctx && findElementProp(ctx.file, toOffset(ctx.file.text, position));
    return prop && { ...ctx, prop };
  }

  /** 模板中绑定元素属性的特性，属性需要在项目中定义 */
  async function getAttributeContext(uri: string, position: Position) {
    if (!renameDeclaration) return;
    const ctx = await getTemplateContext(uri, position);
    if (ctx?.template.kind !== 'html') return;
    const attr = await html.attributeAt(ctx.project, ctx.template, ctx.offset);
    if (!attr || !ts.ast.isPropertyDeclaration(attr.declaration)) return;
    const file = attr.declaration.getSourceFile();
    if (isDepFile(file.fileName)) return;
    const nameStart = attr.declaration.name.getStart(file);
    const prop = findElementProp(file, nameStart);
    if (!prop) return;
    const declaration = {
      textDocument: { uri: ts.api.fileNameToDocumentURI(file.fileName) },
      position: toPosition(file.text, nameStart),
    };
    return { ...ctx, attr, prop, declaration };
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

  const middleware: GemMiddleware = {
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
      const stringTagDefinition = await getStringTagDefinition(params.textDocument.uri, params.position);
      if (stringTagDefinition) return stringTagDefinition;
      const cssDefinition = await getCssDefinition(params.textDocument.uri, params.position);
      if (cssDefinition) return cssDefinition;
      const ctx = await getTemplateContext(params.textDocument.uri, params.position);
      if (ctx?.template.kind !== 'html') return result;
      return (await html.definition(ctx.project, ctx.template, ctx.offset)) ?? result;
    },
    'textDocument/references': async (result, { params }) => {
      const ctx = await getTagContext(params.textDocument.uri, params.position);
      if (ctx) return findTagLocations(ctx.project, ctx.info.tag, css);
      const propCtx = await getPropContext(params.textDocument.uri, params.position);
      if (propCtx) {
        const references = await findPropReferences(propCtx.project, propCtx.prop, index);
        return [...(result ?? []), ...references.map(({ uri, range }) => ({ uri, range }))];
      }
      return (
        (await getCssReferences(params.textDocument.uri, params.position)) ??
        (await getClassNameReferences(params.textDocument.uri, params.position)) ??
        result
      );
    },
    'textDocument/prepareRename': async (result, { params }) => {
      const ctx = await getTagContext(params.textDocument.uri, params.position);
      if (ctx) return { range: ctx.info.range, placeholder: ctx.info.tag };
      const cssCtx = await getCssContext(params.textDocument.uri, params.position);
      const prop = cssCtx && css.customPropertyAt(cssCtx.vDoc, cssCtx.offset);
      if (prop) return { range: prop.range, placeholder: prop.name };
      const attrCtx = await getAttributeContext(params.textDocument.uri, params.position);
      return attrCtx ? { range: attrCtx.attr.range, placeholder: attrCtx.attr.name } : result;
    },
    // 在定义处重命名所有使用的地方，在模板中只重命名当前元素的开始和结束标签
    'textDocument/rename': async (result, { params }) => {
      const { textDocument, position, newName } = params;
      const ctx = await getTagContext(textDocument.uri, position);
      // 自定义属性只在当前样式文档中重命名
      const cssCtx = !ctx && (await getCssContext(textDocument.uri, position));
      const cssProp = cssCtx && css.customPropertyAt(cssCtx.vDoc, cssCtx.offset);
      if (cssCtx && cssProp) {
        const { declarations, references } = css.customPropertyLocations(cssCtx.vDoc, cssProp.name);
        const name = newName.startsWith('--') ? newName : `--${newName}`;
        const locations = [...declarations, ...references].map((range) => ({ uri: textDocument.uri, range }));
        return { changes: toTextEdits(locations, name) };
      }
      // 在模板中重命名特性：重命名属性声明，再修改所有模板中的特性
      const attrCtx = !ctx && (await getAttributeContext(textDocument.uri, position));
      if (attrCtx) {
        const { project, attr, prop, declaration } = attrCtx;
        const propName = attr.isProperty ? newName : kebabToCamelCase(newName);
        const edit = await renameDeclaration!({ ...declaration, newName: propName });
        const references = await findPropReferences(project, prop, index);
        return mergeWorkspaceEdit(edit ?? { changes: {} }, getPropRenameEdits(references, propName));
      }
      if (!ctx) {
        // 重命名属性时同时修改模板中绑定的特性
        const propCtx = await getPropContext(textDocument.uri, position);
        if (!propCtx || !result) return result;
        const references = await findPropReferences(propCtx.project, propCtx.prop, index);
        return mergeWorkspaceEdit(result, getPropRenameEdits(references, newName));
      }
      const { info } = ctx;
      const locations = info.isDefinition
        ? await findTagLocations(ctx.project, info.tag, css)
        : info.tagRanges!.map((range) => ({ uri: textDocument.uri, range }));
      return { changes: toTextEdits(locations, newName) };
    },
    'textDocument/foldingRange': async (result, { params }) => {
      const ctx = await getFileContext(params.textDocument.uri);
      if (!ctx) return result;
      const templates = findTemplates(ctx.file, 'html');
      const cssDocuments = [...findTemplates(ctx.file, 'css'), ...templates.flatMap((t) => html.styles(t))];
      return [
        ...(result ?? []),
        ...templates.flatMap((t) => html.foldingRanges(t)),
        ...cssDocuments.flatMap((doc) => css.foldingRanges(doc)),
      ];
    },
    'textDocument/documentHighlight': async (result, { params }) => {
      const ctx = await getTemplateContext(params.textDocument.uri, params.position);
      if (ctx?.template.kind !== 'html') return result;
      return html.highlights(ctx.template, ctx.offset);
    },
    'textDocument/linkedEditingRange': async (result, { params }) => {
      const ctx = await getTemplateContext(params.textDocument.uri, params.position);
      if (ctx?.template.kind !== 'html') return result;
      const ranges = html.linkedEditingRanges(ctx.template, ctx.offset);
      return ranges ? { ranges } : result;
    },
    // VS Code 输入 `>` 后自动插入结束标签
    'textDocument/_vs_onAutoInsert': async (result, { params }) => {
      const ctx = await getTemplateContext(params._vs_textDocument.uri, params._vs_position);
      if (ctx?.template.kind !== 'html') return result;
      const edit = html.closingTag(ctx.template, ctx.offset);
      return edit ? { _vs_textEditFormat: SNIPPET_FORMAT, _vs_textEdit: edit } : result;
    },
    'textDocument/codeAction': async (result, { params }) => {
      const fixes = getAttrFormatFixes(params.textDocument.uri, params.context.diagnostics);
      return fixes.length ? [...(result ?? []), ...fixes] : result;
    },
  };

  return { middleware, invalidate: (uri) => index.invalidate(uri) };
}
