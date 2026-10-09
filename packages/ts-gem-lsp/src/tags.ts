import type { Node as CssNode } from '@mantou/vscode-css-languageservice';
import { getCSSLanguageService, NodeType, TextDocument } from '@mantou/vscode-css-languageservice';
import type { Node as HtmlNode } from '@mantou/vscode-html-languageservice';
import { getLanguageService } from '@mantou/vscode-html-languageservice';
import type { CallExpression, ClassDeclaration, Node, SourceFile, StringLiteral } from 'typescript/unstable/ast';
import type { Project } from 'typescript/unstable/async';
import type { Location, Range, TextEdit } from 'typescript/unstable/vscode';

import type { CssService } from './css';
import { isDepFile } from './elements';
import type { Template, VirtualDocument } from './template';
import { EmbeddedDocument, findTemplate, findTemplates, getTouchingToken, toPosition } from './template';
import { ts } from './ts';

const htmlLs = getLanguageService();
const cssLs = getCSSLanguageService();

const REGISTRY_METHODS = new Set(['get', 'whenDefined']);
const SELECTOR_METHODS = new Set(['querySelector', 'querySelectorAll', 'closest', 'matches']);

export interface TagInfo {
  tag: string;
  range: Range;
  /** 在 `@customElement` 中定义，否则是模板中使用的标签 */
  isDefinition: boolean;
  /** 模板中的标签，包含开始和结束标签 */
  tagRanges?: Range[];
}

function getTagRanges(template: Template, node: HtmlNode) {
  const tag = node.tag!;
  const ranges = [template.toRangeFromOffsets(node.start + 1, node.start + 1 + tag.length)];
  // 结束标签 `</tag>`
  if (node.endTagStart !== undefined && node.end - node.endTagStart === tag.length + 3) {
    ranges.push(template.toRangeFromOffsets(node.endTagStart + 2, node.endTagStart + 2 + tag.length));
  }
  return ranges;
}

function forEachTagNode(roots: HtmlNode[], fn: (node: HtmlNode) => void) {
  for (const node of roots) {
    if (node.tag) fn(node);
    forEachTagNode(node.children, fn);
  }
}

function stringContentRange(file: SourceFile, node: StringLiteral): Range {
  const start = node.getStart(file) + 1;
  return { start: toPosition(file.text, start), end: toPosition(file.text, start + node.text.length) };
}

function isCustomElementCall(node: Node): node is CallExpression {
  return (
    ts.ast.isCallExpression(node) && ts.ast.isIdentifier(node.expression) && node.expression.text === 'customElement'
  );
}

function getCustomElementArg(node: ClassDeclaration) {
  for (const modifier of node.modifiers ?? []) {
    if (!ts.ast.isDecorator(modifier) || !isCustomElementCall(modifier.expression)) continue;
    const arg = modifier.expression.arguments[0];
    if (arg && ts.ast.isStringLiteral(arg)) return arg;
  }
}

/** `@customElement('my-tag')` 中的标签 */
function findDefinedTag(file: SourceFile, offset: number): TagInfo | undefined {
  const node = getTouchingToken(file, offset);
  if (!ts.ast.isStringLiteral(node) || !isCustomElementCall(node.parent)) return;
  return { tag: node.text, range: stringContentRange(file, node), isDefinition: true };
}

/** 选择器中的元素选择器，位置是选择器中的偏移 */
function getSelectorTags(selector: string) {
  const result: { tag: string; start: number; end: number }[] = [];
  const visit = (node: CssNode) => {
    if (node.type === NodeType.ElementNameSelector)
      result.push({ tag: node.getText(), start: node.offset, end: node.end });
    node.getChildren().forEach(visit);
  };
  visit(cssLs.parseStylesheet(TextDocument.create('gem-selector://', 'css', 0, `${selector}{}`)) as CssNode);
  return result;
}

/**
 * 字符串参数中的标签：`createElement('my-tag')` `customElements.get('my-tag')`
 * `querySelector('.list my-tag')` 等，位置是字符串内容中的偏移
 */
function getCallTags(node: Node) {
  if (!ts.ast.isCallExpression(node) || !ts.ast.isPropertyAccessExpression(node.expression)) return;
  const [arg] = node.arguments;
  if (!arg || !(ts.ast.isStringLiteral(arg) || ts.ast.isNoSubstitutionTemplateLiteral(arg))) return;
  const { name, expression } = node.expression;
  const isRegistry = ts.ast.isIdentifier(expression) && expression.text === 'customElements';
  if (name.text === 'createElement' || (isRegistry && REGISTRY_METHODS.has(name.text))) {
    return { arg, tags: [{ tag: arg.text, start: 0, end: arg.text.length }] };
  }
  if (SELECTOR_METHODS.has(name.text)) return { arg, tags: getSelectorTags(arg.text) };
}

function stringTagRange(file: SourceFile, arg: Node, start: number, end: number): Range {
  const contentStart = arg.getStart(file) + 1;
  return { start: toPosition(file.text, contentStart + start), end: toPosition(file.text, contentStart + end) };
}

/** 光标所在的字符串参数中的标签 */
function findCallTag(file: SourceFile, offset: number): TagInfo | undefined {
  const token = getTouchingToken(file, offset);
  const call = token.parent && getCallTags(token.parent);
  if (call?.arg !== token) return;
  const contentStart = token.getStart(file) + 1;
  const found = call.tags.find(({ start, end }) => offset >= contentStart + start && offset <= contentStart + end);
  if (!found) return;
  const range = stringTagRange(file, token, found.start, found.end);
  return { tag: found.tag, range, isDefinition: false, tagRanges: [range] };
}

/** 光标所在的模板标签名 */
function findTemplateTag(file: SourceFile, offset: number): TagInfo | undefined {
  const template = findTemplate(file, offset);
  if (template?.kind !== 'html') return;
  const vOffset = template.toVirtualOffset(offset);
  const vHtml = htmlLs.parseHTMLDocument(template.doc);
  const node = vHtml.findNodeAt(vOffset);
  if (!node.tag) return;
  const tagRanges = getTagRanges(template, node);
  const inTagName = [node.start + 1, node.endTagStart === undefined ? -1 : node.endTagStart + 2].some(
    (start) => start >= 0 && vOffset >= start && vOffset <= start + node.tag!.length,
  );
  if (!inTagName) return;
  return { tag: node.tag, range: tagRanges[0], isDefinition: false, tagRanges };
}

export function findTagAt(file: SourceFile, offset: number) {
  return findDefinedTag(file, offset) ?? findCallTag(file, offset) ?? findTemplateTag(file, offset);
}

/** 项目中的源文件，不包含依赖 */
export async function getProjectFiles(project: Project) {
  const fileNames = (await project.program.getSourceFileNames()).filter((name) => !isDepFile(name));
  const files = await Promise.all(fileNames.map((name) => project.program.getSourceFile(name)));
  return files.filter((file) => !!file);
}

/** 项目中所有使用和定义该标签的位置，包括 CSS 中的元素选择器 */
export async function findTagLocations(project: Project, tag: string, css: CssService): Promise<Location[]> {
  const locations: Location[] = [];
  for (const file of await getProjectFiles(project)) {
    const uri = ts.api.fileNameToDocumentURI(file.fileName);
    const cssDocuments: VirtualDocument[] = findTemplates(file, 'css');
    for (const template of findTemplates(file, 'html')) {
      forEachTagNode(htmlLs.parseHTMLDocument(template.doc).roots, (node) => {
        const { startTagEnd, endTagStart } = node;
        if (node.tag === 'style' && startTagEnd !== undefined && endTagStart !== undefined) {
          cssDocuments.push(new EmbeddedDocument(template, startTagEnd, endTagStart, 'css'));
        }
        if (node.tag !== tag) return;
        for (const range of getTagRanges(template, node)) locations.push({ uri, range });
      });
    }
    for (const vDoc of cssDocuments) {
      for (const range of css.elementSelectors(vDoc, tag)) locations.push({ uri, range });
    }
    for (const node of file.statements) {
      const arg = ts.ast.isClassDeclaration(node) ? getCustomElementArg(node) : undefined;
      if (arg?.text === tag) locations.push({ uri, range: stringContentRange(file, arg) });
    }
    file.forEachChild(function visit(node): undefined {
      const call = getCallTags(node);
      for (const found of call?.tags ?? []) {
        if (found.tag === tag) locations.push({ uri, range: stringTagRange(file, call!.arg, found.start, found.end) });
      }
      node.forEachChild(visit);
    });
  }
  return locations;
}

export function toTextEdits(locations: Location[], newText: string) {
  const changes: Record<string, TextEdit[]> = {};
  for (const { uri, range } of locations) (changes[uri] ??= []).push({ range, newText });
  return changes;
}
