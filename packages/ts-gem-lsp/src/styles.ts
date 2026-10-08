import type { ClassDeclaration, Node, ObjectLiteralExpression, SourceFile } from 'typescript/unstable/ast';
import {
  getTokenAtPosition,
  isCallExpression,
  isClassDeclaration,
  isDecorator,
  isIdentifier,
  isObjectLiteralExpression,
  isPropertyAssignment,
  isVariableDeclaration,
} from 'typescript/unstable/ast';
import type { Project } from 'typescript/unstable/async';
import { SymbolFlags } from 'typescript/unstable/async';

import type { CssService } from './css';
import { getTagFromDecorator } from './elements';
import type { Template } from './template';
import { findAncestor, findTemplates } from './template';

/** 模板所在的元素类 */
export function getElementClass(template: Template) {
  return findAncestor(template.node, (node): node is ClassDeclaration => {
    return isClassDeclaration(node) && !!getTagFromDecorator(node);
  });
}

/** 变量引用解析到其初始值，可能在其他文件中 */
async function resolveStyleExpression(project: Project, node: Node): Promise<Node | undefined> {
  if (!isIdentifier(node)) return node;
  const { checker } = project;
  let symbol = await checker.getSymbolAtLocation(node);
  // 从其他模块导入
  if (symbol && symbol.flags & SymbolFlags.Alias) symbol = await checker.getAliasedSymbol(symbol);
  const declaration = await symbol?.valueDeclaration?.resolve(project);
  if (!declaration || !isVariableDeclaration(declaration) || !declaration.initializer) return;
  return resolveStyleExpression(project, declaration.initializer);
}

/**
 * 元素通过 `@adoptedStyle` 使用的样式模板，不支持获取继承类的样式
 */
export async function getElementStyles(project: Project, element: ClassDeclaration) {
  const args = (element.modifiers ?? []).flatMap((modifier) => {
    if (!isDecorator(modifier) || !isCallExpression(modifier.expression)) return [];
    const { expression, arguments: args } = modifier.expression;
    return isIdentifier(expression) && expression.text === 'adoptedStyle' && args[0] ? [args[0]] : [];
  });
  const expressions = await Promise.all(args.map((arg) => resolveStyleExpression(project, arg)));
  return expressions.flatMap((expression) =>
    expression ? findTemplates(expression.getSourceFile(), 'css', expression) : [],
  );
}

/** 元素样式中的类名和 id（带 `#`），值是选择器在样式模板中的位置 */
export async function getElementSelectors(project: Project, element: ClassDeclaration, css: CssService) {
  const styles = await getElementStyles(project, element);
  return styles.flatMap((template) => css.classIdSelectors(template).map((selector) => ({ ...selector, template })));
}

/** `classMap({ | })` 中可以输入键的位置 */
export function findClassMapObject(file: SourceFile, offset: number) {
  const token = getTokenAtPosition(file, offset);
  const obj = findAncestor(token, isObjectLiteralExpression) as ObjectLiteralExpression | undefined;
  const call = obj?.parent;
  if (!obj || !call || !isCallExpression(call) || !isIdentifier(call.expression)) return;
  if (call.expression.text !== 'classMap') return;
  // 在值中不是键
  const inInitializer = obj.properties.some(
    (p) => isPropertyAssignment(p) && offset > p.initializer.getStart(file) && offset <= p.initializer.end,
  );
  return inInitializer ? undefined : obj;
}

/** 元素样式中还没有使用的类名 */
export async function getClassMapKeys(project: Project, file: SourceFile, offset: number, css: CssService) {
  const obj = findClassMapObject(file, offset);
  const element = obj && findAncestor(obj, (node): node is ClassDeclaration => isClassDeclaration(node));
  if (!obj || !element) return;
  const used = new Set(
    obj.properties.map((p) => ('name' in p && p.name ? p.name.getText(file).replace(/^['"]|['"]$/g, '') : '')),
  );
  const selectors = await getElementSelectors(project, element, css);
  return [...new Set(selectors.map(({ name }) => name))].filter((name) => !name.startsWith('#') && !used.has(name));
}
