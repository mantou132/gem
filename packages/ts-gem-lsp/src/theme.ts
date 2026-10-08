import type { Node, ObjectLiteralExpression, SourceFile } from 'typescript/unstable/ast';
import {
  getTokenAtPosition,
  isArrowFunction,
  isCallExpression,
  isClassDeclaration,
  isClassExpression,
  isDecorator,
  isFunctionDeclaration,
  isFunctionExpression,
  isIdentifier,
  isMethodDeclaration,
  isObjectLiteralExpression,
  isParenthesizedExpression,
  isPropertyAccessExpression,
  isPropertyAssignment,
  isPropertyDeclaration,
  isReturnStatement,
  isVariableDeclaration,
} from 'typescript/unstable/ast';
import type { Project } from 'typescript/unstable/async';
import { SymbolFlags, TypeFlags } from 'typescript/unstable/async';

import { findAncestor } from './template';

/** 函数返回的对象字面量 `() => ({ | })` `return { | }` */
function isReturnObject(node: ObjectLiteralExpression) {
  const { parent } = node;
  return (
    isReturnStatement(parent) ||
    (isParenthesizedExpression(parent) && isArrowFunction(parent.parent) && parent.parent.body === parent)
  );
}

/** 返回对象中可以输入键的位置 */
function findReturnObject(file: SourceFile, offset: number) {
  const obj = findAncestor(getTokenAtPosition(file, offset), isObjectLiteralExpression);
  if (!obj || !isReturnObject(obj)) return;
  const inInitializer = obj.properties.some(
    (p) => isPropertyAssignment(p) && offset > p.initializer.getStart(file) && offset <= p.initializer.end,
  );
  return inInitializer ? undefined : obj;
}

/** 被装饰的成员，嵌套函数中的返回对象不是主题 */
function findDecoratedMember(obj: Node) {
  for (let node = obj.parent; node; node = node.parent) {
    if (isPropertyDeclaration(node) || isMethodDeclaration(node)) return node;
    const isFunction = (isArrowFunction(node) || isFunctionExpression(node)) && !isPropertyDeclaration(node.parent);
    if (isFunction || isFunctionDeclaration(node) || isClassDeclaration(node) || isClassExpression(node)) return;
  }
}

/**
 * `@theme() #update = () => ({ | })` 中主题的键，主题由 `createDecoratorTheme({ ... })` 创建
 */
export async function getThemeKeys(project: Project, file: SourceFile, offset: number) {
  const obj = findReturnObject(file, offset);
  const member = obj && findDecoratedMember(obj);
  if (!obj || !member) return;
  const { checker } = project;
  for (const modifier of member.modifiers ?? []) {
    if (!isDecorator(modifier) || !isCallExpression(modifier.expression)) continue;
    let symbol = await checker.getSymbolAtLocation(modifier.expression.expression);
    if (symbol && symbol.flags & SymbolFlags.Alias) symbol = await checker.getAliasedSymbol(symbol);
    const declaration = await symbol?.valueDeclaration?.resolve(project);
    const init = declaration && isVariableDeclaration(declaration) ? declaration.initializer : undefined;
    const isTheme =
      init &&
      isCallExpression(init) &&
      isIdentifier(init.expression) &&
      init.expression.text === 'createDecoratorTheme';
    const [param] = isTheme ? init.arguments : [];
    if (!param) continue;
    const props = await (await checker.getTypeAtLocation(param)).getApparentProperties();
    const used = new Set(obj.properties.map((p) => ('name' in p && p.name ? p.name.getText(file) : '')));
    return props.map((prop) => prop.name).filter((name) => !used.has(name));
  }
}

/**
 * 成员访问补全中类型为 `never` 的成员，例如 `state.|`
 */
export async function getNeverMembers(project: Project, file: SourceFile, offset: number) {
  // 跳过已输入的标识符
  let dot = offset;
  while (dot > 0 && /[\w$#]/.test(file.text[dot - 1])) dot--;
  if (file.text[dot - 1] !== '.') return;
  const access = getTokenAtPosition(file, dot - 1).parent;
  if (!access || !isPropertyAccessExpression(access)) return;
  const { checker } = project;
  const props = await (await checker.getTypeAtLocation(access.expression)).getApparentProperties();
  if (!props.length) return;
  const types = await checker.getTypeOfSymbol(props);
  return new Set(props.filter((_, i) => types[i].flags & TypeFlags.Never).map((prop) => prop.name));
}
