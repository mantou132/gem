import type { Node as HtmlNode } from '@mantou/vscode-html-languageservice';
import { getLanguageService } from '@mantou/vscode-html-languageservice';
import type { ClassDeclaration, Node, SourceFile } from 'typescript/unstable/ast';
import type { Project } from 'typescript/unstable/async';
import type { Location, Range } from 'typescript/unstable/vscode';

import type { CssService } from './css';
import type { ElementIndex } from './elements';
import { getElementNode, getTagFromDecorator } from './elements';
import { getElementSelectors, getElementStyles } from './styles';
import type { Template } from './template';
import { findAncestor, findTemplate, findTemplates, getTouchingToken, toPosition } from './template';
import { ts } from './ts';

const htmlLs = getLanguageService();

/** 类名不带 `.`，id 带 `#` */
export interface ClassNameRef {
  name: string;
  range: Range;
}

function isElementClass(node: Node): node is ClassDeclaration {
  return ts.ast.isClassDeclaration(node) && !!getTagFromDecorator(node);
}

function forEachHtmlNode(nodes: HtmlNode[], fn: (node: HtmlNode) => void) {
  for (const node of nodes) {
    fn(node);
    forEachHtmlNode(node.children, fn);
  }
}

/** html 模板中 `class` `id` 属性值中的类名，跳过插值 */
function getAttrClassNames(template: Template) {
  const result: (ClassNameRef & { start: number; end: number })[] = [];
  forEachHtmlNode(htmlLs.parseHTMLDocument(template.doc).roots, (node) => {
    for (const attr of ['class', 'id'] as const) {
      const info = node.attributesMap.get(attr);
      if (!info?.value) continue;
      // 属性值从 `=` 之后开始
      const valueStart = info.end + 1;
      for (const { 0: word, index } of info.value.matchAll(/[\w-]+/g)) {
        if (/^_+$/.test(word)) continue;
        const start = valueStart + index;
        const end = start + word.length;
        result.push({
          name: attr === 'id' ? `#${word}` : word,
          range: template.toRangeFromOffsets(start, end),
          start,
          end,
        });
      }
    }
  });
  return result;
}

function stringContentRange(file: SourceFile, node: Node) {
  const quote = ts.ast.isStringLiteral(node) ? 1 : 0;
  const start = node.getStart(file) + quote;
  return { start: toPosition(file.text, start), end: toPosition(file.text, node.end - quote) };
}

/** `classMap({ key })` 中的键 */
function getClassMapKeyNodes(root: Node) {
  const keys: Node[] = [];
  root.forEachChild(function visit(node): undefined {
    if (ts.ast.isCallExpression(node) && ts.ast.isIdentifier(node.expression) && node.expression.text === 'classMap') {
      const [obj] = node.arguments;
      if (obj && ts.ast.isObjectLiteralExpression(obj)) {
        for (const prop of obj.properties) {
          if ('name' in prop && prop.name && (ts.ast.isIdentifier(prop.name) || ts.ast.isStringLiteral(prop.name))) {
            keys.push(prop.name);
          }
        }
      }
    }
    node.forEachChild(visit);
  });
  return keys;
}

/** 元素类中使用类名的地方：html 模板 `class` `id` 属性值和 `classMap` 的键 */
export function findClassNameUsages(element: ClassDeclaration): (ClassNameRef & { uri: string })[] {
  const file = element.getSourceFile();
  const uri = ts.api.fileNameToDocumentURI(file.fileName);
  const attrs = findTemplates(file, 'html', element).flatMap(getAttrClassNames);
  const keys = getClassMapKeyNodes(element).map((node) => ({
    name: (node as { text: string } & Node).text,
    range: stringContentRange(file, node),
  }));
  return [...attrs, ...keys].map(({ name, range }) => ({ name, range, uri }));
}

/** 光标处的类名：html 模板 `class` `id` 属性值或 `classMap` 的键 */
export function findClassNameAt(file: SourceFile, offset: number) {
  const template = findTemplate(file, offset);
  if (template?.kind === 'html') {
    const vOffset = template.toVirtualOffset(offset);
    const ref = getAttrClassNames(template).find(({ start, end }) => vOffset >= start && vOffset <= end);
    const element = findAncestor(template.node, isElementClass);
    return ref && element && { name: ref.name, range: ref.range, element };
  }
  const token = getTouchingToken(file, offset);
  if (!ts.ast.isIdentifier(token) && !ts.ast.isStringLiteral(token)) return;
  const isKey = getClassMapKeyNodes(file).includes(token);
  const element = findAncestor(token, isElementClass);
  if (!isKey || !element) return;
  return { name: token.text, range: stringContentRange(file, token), element };
}

/** 元素样式中该类名的选择器 */
export async function findClassNameSelectors(
  project: Project,
  element: ClassDeclaration,
  name: string,
  css: CssService,
): Promise<Location[]> {
  const selectors = await getElementSelectors(project, element, css);
  return selectors
    .filter((selector) => selector.name === name)
    .map(({ template, start, end }) => ({
      uri: ts.api.fileNameToDocumentURI(template.fileName),
      range: template.toRangeFromOffsets(start, end),
    }));
}

/** 使用该样式模板的元素 */
export async function findElementsUsingStyle(project: Project, style: Template, index: ElementIndex) {
  const elements = await index.get(project);
  const nodes = await Promise.all(
    [...elements.values()].filter((ref) => !ref.isDep).map((ref) => getElementNode(project, ref)),
  );
  const result: ClassDeclaration[] = [];
  for (const node of nodes) {
    if (!node) continue;
    const styles = await getElementStyles(project, node);
    if (styles.some((s) => s.fileName === style.fileName && s.node.pos === style.node.pos)) result.push(node);
  }
  return result;
}
