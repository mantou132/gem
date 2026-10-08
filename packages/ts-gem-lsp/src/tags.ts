import type { Node as HtmlNode } from '@mantou/vscode-html-languageservice';
import { getLanguageService } from '@mantou/vscode-html-languageservice';
import type { CallExpression, ClassDeclaration, Node, SourceFile, StringLiteral } from 'typescript/unstable/ast';
import {
  getTokenAtPosition,
  isCallExpression,
  isClassDeclaration,
  isDecorator,
  isIdentifier,
  isStringLiteral,
} from 'typescript/unstable/ast';
import type { Project } from 'typescript/unstable/async';
import { fileNameToDocumentURI } from 'typescript/unstable/async';
import type { Location, Range, TextEdit } from 'typescript/unstable/vscode';

import { isDepFile } from './elements';
import type { Template } from './template';
import { findTemplate, findTemplates, toPosition } from './template';

const htmlLs = getLanguageService();

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
  return isCallExpression(node) && isIdentifier(node.expression) && node.expression.text === 'customElement';
}

function getCustomElementArg(node: ClassDeclaration) {
  for (const modifier of node.modifiers ?? []) {
    if (!isDecorator(modifier) || !isCustomElementCall(modifier.expression)) continue;
    const arg = modifier.expression.arguments[0];
    if (arg && isStringLiteral(arg)) return arg;
  }
}

/** `@customElement('my-tag')` 中的标签 */
function findDefinedTag(file: SourceFile, offset: number): TagInfo | undefined {
  const node = getTokenAtPosition(file, offset);
  if (!isStringLiteral(node) || !isCustomElementCall(node.parent)) return;
  return { tag: node.text, range: stringContentRange(file, node), isDefinition: true };
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
  return findDefinedTag(file, offset) ?? findTemplateTag(file, offset);
}

/** 项目中所有使用和定义该标签的位置 */
export async function findTagLocations(project: Project, tag: string): Promise<Location[]> {
  const fileNames = (await project.program.getSourceFileNames()).filter((name) => !isDepFile(name));
  const files = await Promise.all(fileNames.map((name) => project.program.getSourceFile(name)));
  const locations: Location[] = [];
  for (const file of files) {
    if (!file) continue;
    const uri = fileNameToDocumentURI(file.fileName);
    for (const template of findTemplates(file, 'html')) {
      forEachTagNode(htmlLs.parseHTMLDocument(template.doc).roots, (node) => {
        if (node.tag !== tag) return;
        for (const range of getTagRanges(template, node)) locations.push({ uri, range });
      });
    }
    for (const node of file.statements) {
      const arg = isClassDeclaration(node) ? getCustomElementArg(node) : undefined;
      if (arg?.text === tag) locations.push({ uri, range: stringContentRange(file, arg) });
    }
  }
  return locations;
}

export function toTextEdits(locations: Location[], newText: string) {
  const changes: Record<string, TextEdit[]> = {};
  for (const { uri, range } of locations) (changes[uri] ??= []).push({ range, newText });
  return changes;
}
