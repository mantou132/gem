import type { Node } from '@mantou/vscode-html-languageservice';
import { isNotNullish } from 'duoyun-ui/lib/types';
import type * as ts from 'typescript/lib/tsserverlibrary';

export function isCustomElementTag(tag: string) {
  return tag.includes('-');
}

export function isDepElement(node: ts.Node) {
  const { fileName } = node.getSourceFile();
  return ['/node_modules/', '/dist/', '.d.ts'].some((s) => fileName.includes(s));
}

export function bindMemberFunction<T extends object>(o: T, keys = Object.keys(o) as (keyof T)[]) {
  return Object.fromEntries(keys.map((key) => [key, (o as any)[key].bind?.(o)])) as T;
}

export function forEachNode<T extends { children: readonly T[] } | { getChildren: () => readonly T[] }>(
  roots: readonly T[],
  fn: (node: T) => void,
) {
  const list = [...roots];
  while (true) {
    const currentNode = list.pop();
    if (!currentNode) return;
    fn(currentNode);
    list.push(...('getChildren' in currentNode ? currentNode.getChildren() : currentNode.children));
  }
}

export function getTemplateNode(typescript: typeof ts, node: ts.Node) {
  if (typescript.isTaggedTemplateExpression(node)) return node.template;
  if (typescript.isTemplateExpression(node)) return node;
  if (typescript.isNoSubstitutionTemplateLiteral(node)) return node;
}

export function isClassMapKey(typescript: typeof ts, node: ts.Node): node is ts.StringLiteral | ts.Identifier {
  if (!node.parent?.parent?.parent) return false;
  const assignment = node.parent;
  const obj = assignment.parent;
  const callExp = obj.parent;
  const key = typescript.isStringLiteral(node) || typescript.isIdentifier(node);
  return (
    key &&
    typescript.isPropertyAssignment(assignment) &&
    typescript.isObjectLiteralExpression(obj) &&
    typescript.isCallExpression(callExp) &&
    typescript.isIdentifier(callExp.expression) &&
    callExp.expression.text === 'classMap'
    // 不支持计算属性和动态属性
  );
}

export function getAllStyleNode(typescript: typeof ts, typeChecker: ts.TypeChecker, node: ts.ClassDeclaration) {
  const getArgNode = (arg: ts.Node) => {
    if (typescript.isIdentifier(arg)) {
      const decl = typeChecker.getSymbolAtLocation(arg)?.valueDeclaration;
      if (!decl || !typescript.isVariableDeclaration(decl) || !decl.initializer) return;
      return getArgNode(decl.initializer);
    }
    const styleNode = getTemplateNode(typescript, arg);
    if (styleNode) return styleNode;
    const argArg = typescript.isCallExpression(arg) && arg.arguments.at(0);
    if (argArg && typescript.isObjectLiteralExpression(argArg)) {
      return argArg.properties.map((p) => {
        const initializer = typescript.isPropertyAssignment(p) && p.initializer;
        return initializer ? getTemplateNode(typescript, initializer) : undefined;
      });
    }
  };
  return (node.modifiers || [])
    .flatMap((m) => {
      const arg =
        typescript.isDecorator(m) &&
        typescript.isCallExpression(m.expression) &&
        typescript.isIdentifier(m.expression.expression) &&
        m.expression.expression.escapedText === 'adoptedStyle'
          ? m.expression.arguments.at(0)
          : undefined;
      if (!arg) return null;
      return getArgNode(arg);
    })
    .filter(isNotNullish);
}

export function getTagFromNodeWithDecorator(typescript: typeof ts, node: ts.Node) {
  if (!typescript.isClassDeclaration(node)) return;

  for (const modifier of node.modifiers || []) {
    if (
      typescript.isDecorator(modifier) &&
      typescript.isCallExpression(modifier.expression) &&
      modifier.expression.expression.getText() === 'customElement'
    ) {
      const arg = modifier.expression.arguments.at(0);
      if (arg && typescript.isStringLiteral(arg)) {
        return arg.text;
      }
    }
  }
}

export function getCurrentElementDecl(typescript: typeof ts, node: ts.Node) {
  while (!getTagFromNodeWithDecorator(typescript, node)) {
    node = node.parent;
    if (!node) return;
  }
  return node as ts.ClassDeclaration;
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

export function getAllText(text: string) {
  return [...text.matchAll(/\b\w+\b/g)].map(({ 0: v, index }) => ({
    start: index,
    length: v.length,
    value: v,
  }));
}

export function getTextAtPosition(text: string, offset: number) {
  for (const { value, start } of getAllText(text)) {
    if (offset >= start && offset <= start + value.length) {
      return { text: value, start: start, length: value.length };
    }
  }
}

/**从属性键值字符串上解析出不包含装饰符的名称 */
export function getAttrName(text: string) {
  const attr = text.split('=').at(0)!;
  const isNotLetter = hasDecoratorAttr(attr);
  const offset = isNotLetter ? 1 : 0;
  return {
    attr: attr.slice(offset),
    offset,
    decorate: isNotLetter ? attr.at(0)! : '',
  };
}

export function hasDecoratorAttr(str: string) {
  return str.charCodeAt(0) < 65;
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

const marker = Symbol();
/**只调用一次回调函数 */
export function decorate<T>(origin: T, cb: (o: T) => T): T {
  if ((origin as any)[marker]) return origin;
  const result = cb(origin);
  (result as any)[marker] = true;
  return result;
}
