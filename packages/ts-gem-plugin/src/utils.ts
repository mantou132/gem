import type { Node } from '@mantou/vscode-html-languageservice';
import type * as ts from 'typescript/lib/tsserverlibrary';

export function isCustomElementTag(tag: string) {
  return tag.includes('-');
}

export function isDepElement(node: ts.Node) {
  return node.getSourceFile().fileName.includes('/node_modules/');
}

export function bindMemberFunction<T extends object>(o: T, keys = Object.keys(o) as (keyof T)[]) {
  return Object.fromEntries(keys.map((key) => [key, (o as any)[key].bind?.(o)])) as T;
}

export function forEachNode<T extends { children: T[] }>(roots: T[], fn: (node: T) => void) {
  const list = [...roots];
  while (true) {
    const currentNode = list.pop();
    if (!currentNode) return;
    fn(currentNode);
    list.push(...currentNode.children);
  }
}

export function getAstNodeAtPosition(typescript: typeof ts, node: ts.Node, pos: number) {
  if (node.pos > pos || node.end <= pos) return;
  while (node.kind >= typescript.SyntaxKind.FirstNode) {
    const nested = typescript.forEachChild(node, (child) => (child.pos <= pos && child.end > pos ? child : undefined));
    if (nested === undefined) break;
    node = nested;
  }
  return node;
}

const BEFORE_REG = /[^\s</>]+$/;
const AFTER_REG = /^[^\s</>]+/;
/**获取 Tag 或者 Attribute */
export function getHTMLTextAtPosition(text: string, offset: number) {
  const before = text.slice(0, offset).match(BEFORE_REG)?.at(0) || '';
  const after = text.slice(offset).match(AFTER_REG)?.at(0) || '';
  const str = before + after;
  return {
    before,
    after,
    text: str,
    start: offset - before.length,
    length: str.length,
  };
}

/**从属性键值字符串上解析出不包含装饰符的名称 */
export function getAttrName(text: string) {
  const attr = text.split('=').at(0)!;
  const firstChar = attr.at(0)!;
  const isNotLetter = firstChar.charCodeAt(0) < 65;
  const offset = isNotLetter ? 1 : 0;
  return {
    attr: attr.slice(offset),
    offset,
    decorate: isNotLetter ? firstChar : '',
  };
}

export function getTagInfo(node: Node, offset: number) {
  const tag = node.tag!;
  const openStart = node.start + 1 + offset;
  return {
    node,
    tag,
    offset,
    open: { start: openStart, length: tag.length },
    end: node.endTagStart && {
      start: node.endTagStart! + 2 + offset,
      length: node.end - node.endTagStart! - 3,
    },
  };
}

export function getAttrTextSpan(file: ts.SourceFile, tagInfo: ReturnType<typeof getTagInfo>, attrName: string) {
  const { attributes = {}, start, startTagEnd } = tagInfo.node;
  if (!(attrName in attributes)) return;
  const attrStart = file.getFullText().slice(start + tagInfo.offset, startTagEnd! + tagInfo.offset);
  const index = attrStart.split(attrName)[0].length;
  const originStart = start + index;
  return {
    originStart,
    start: originStart + tagInfo.offset,
    length: attrName.length,
  };
}

const marker = Symbol();
/**只调用一次回调函数 */
export function decorate<T>(origin: T, cb: (o: T) => T): T {
  if ((origin as any)[marker]) return origin;
  const result = cb(origin);
  (result as any)[marker] = true;
  return result;
}
