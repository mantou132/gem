import { camelToKebabCase } from '@mantou/gem/lib/utils';
import type { Node as HtmlNode } from '@mantou/vscode-html-languageservice';
import { getLanguageService } from '@mantou/vscode-html-languageservice';
import type {
  ClassDeclaration,
  Expression,
  Identifier,
  Node,
  ObjectLiteralExpression,
  PropertyDeclaration,
  SourceFile,
  StringLiteral,
} from 'typescript/unstable/ast';
import type { NodeHandle, Project, Type } from 'typescript/unstable/async';
import type { Location, Range, TextEdit } from 'typescript/unstable/vscode';

import type { ElementIndex } from './elements';
import { getDecoratorNames, getTagFromDecorator, resolveElementType } from './elements';
import { getProjectFiles } from './tags';
import type { Template } from './template';
import { findTemplates, getTouchingToken, toPosition } from './template';
import { ts } from './ts';

const htmlLs = getLanguageService();

const ATTRIBUTE_DECORATORS = ['attribute', 'numattribute', 'boolattribute'];
const PROPERTY_DECORATORS = ['property'];
const EMITTER_DECORATORS = ['emitter', 'globalemitter'];

const ATTRIBUTE_METHODS = new Set([
  'getAttribute',
  'setAttribute',
  'hasAttribute',
  'removeAttribute',
  'toggleAttribute',
]);
const EVENT_METHODS = new Set(['addEventListener', 'removeEventListener']);

type PropKind = 'attribute' | 'property' | 'event';

export interface ElementProp {
  name: Identifier;
  element: ClassDeclaration;
  kind: PropKind;
}

/** 属性被使用的地方，`newText` 根据新的属性名生成替换文本 */
export interface PropReference extends Location {
  newText: (name: string) => string;
}

const asKebab = (name: string) => camelToKebabCase(name);
const asCamel = (name: string) => name;

function getPropKind(decorators: string[]): PropKind | undefined {
  if (decorators.some((d) => EMITTER_DECORATORS.includes(d))) return 'event';
  if (decorators.some((d) => ATTRIBUTE_DECORATORS.includes(d))) return 'attribute';
  if (decorators.some((d) => PROPERTY_DECORATORS.includes(d))) return 'property';
}

/** 模板中绑定属性的写法：装饰符、名称和名称格式 */
function getAttrForms({ name, kind }: ElementProp): [decorate: string, name: string, format: typeof asKebab][] {
  const kebab = camelToKebabCase(name.text);
  if (kind === 'event') return [['@', kebab, asKebab]];
  return [
    ['', kebab, asKebab],
    ['?', kebab, asKebab],
    ['.', name.text, asCamel],
  ];
}

/** 光标处元素类中被装饰的属性名 */
export function findElementProp(file: SourceFile, offset: number): ElementProp | undefined {
  const token = getTouchingToken(file, offset);
  const decl = token.parent;
  if (!ts.ast.isIdentifier(token) || !decl || !ts.ast.isPropertyDeclaration(decl) || decl.name !== token) return;
  const element = decl.parent;
  if (!ts.ast.isClassDeclaration(element) || !getTagFromDecorator(element)) return;
  const kind = getPropKind(getDecoratorNames(decl as PropertyDeclaration));
  return kind && { name: token, element, kind };
}

/**
 * 和 TypeScript 重命名范围一致的属性：继承、`implements`、子类重写，
 * 不使用类型兼容判断，避免结构相同的无关元素
 */
async function getRelatedPropTest(project: Project, prop: ElementProp) {
  const file = prop.name.getSourceFile();
  const entries = await project.languageService.getReferencedSymbolsForNode(prop.name, prop.name.getStart(file));
  // 可选属性在类型上是另外的 symbol，所以比较声明
  const declarations = new Set(entries.flatMap(({ symbol }) => symbol?.declarations.map(declarationKey) ?? []));
  /** 类型上的同名属性是否是相关属性 */
  return async (type: Type) => {
    const symbol = await type.getProperty(prop.name.text);
    return !!symbol?.declarations.some((handle) => declarations.has(declarationKey(handle)));
  };
}

const declarationKey = ({ path, index }: NodeHandle) => `${path}:${index}`;

function forEachHtmlNode(nodes: HtmlNode[], fn: (node: HtmlNode) => void) {
  for (const node of nodes) {
    fn(node);
    forEachHtmlNode(node.children, fn);
  }
}

function forEachNode(root: Node, fn: (node: Node) => void) {
  root.forEachChild(function visit(node): undefined {
    fn(node);
    node.forEachChild(visit);
  });
}

function isStringArg(node: Node | undefined): node is StringLiteral {
  return !!node && (ts.ast.isStringLiteral(node) || ts.ast.isNoSubstitutionTemplateLiteral(node));
}

/** 节点的范围，`quote` 表示去掉两端的引号 */
function nodeRange(file: SourceFile, node: Node, quote = 0): Range {
  const start = node.getStart(file) + quote;
  return { start: toPosition(file.text, start), end: toPosition(file.text, node.end - quote) };
}

/** 元素开始标签中展开的对象 `<my-element ${{ prop }}>`，Gem 使用 `Object.assign` 设置属性 */
function forEachSpreadObject(template: Template, fn: (tag: string, obj: ObjectLiteralExpression) => void) {
  if (!ts.ast.isTemplateExpression(template.node)) return;
  const html = htmlLs.parseHTMLDocument(template.doc);
  const text = template.doc.getText();
  for (const { expression } of template.node.templateSpans) {
    if (!ts.ast.isObjectLiteralExpression(expression)) continue;
    // `${` 在虚拟文档中的位置
    const vOffset = template.toVirtualOffset(expression.getStart(template.file)) - 2;
    const node = html.findNodeAt(vOffset);
    if (!node.tag || node.startTagEnd === undefined || vOffset > node.startTagEnd) continue;
    // 特性值中的插值不是展开
    if (/=\s*["']?\s*$/.test(text.slice(node.start, vOffset))) continue;
    fn(node.tag, expression);
  }
}

/** 属性被使用的地方：模板中的特性、展开对象的键、`setAttribute` `addEventListener` 等方法的参数 */
export async function findPropReferences(project: Project, prop: ElementProp, index: ElementIndex) {
  const isRelated = await getRelatedPropTest(project, prop);
  const elements = await index.get(project);
  const elementFile = prop.element.getSourceFile();
  const tags = new Set<string>();
  await Promise.all(
    [...elements.keys()].map(async (tag) => {
      const type = await resolveElementType(project, elementFile, elements, tag);
      if (type && (await isRelated(type.type))) tags.add(tag);
    }),
  );

  const name = prop.name.text;
  const kebab = camelToKebabCase(name);
  const forms = getAttrForms(prop);
  const methods = prop.kind === 'event' ? EVENT_METHODS : prop.kind === 'attribute' ? ATTRIBUTE_METHODS : undefined;
  const result: PropReference[] = [];
  const calls: { uri: string; file: SourceFile; receiver: Expression; arg: StringLiteral }[] = [];

  for (const file of await getProjectFiles(project)) {
    const uri = ts.api.fileNameToDocumentURI(file.fileName);
    for (const template of findTemplates(file, 'html')) {
      forEachHtmlNode(htmlLs.parseHTMLDocument(template.doc).roots, (node) => {
        if (!node.tag || !tags.has(node.tag)) return;
        for (const [decorate, attr, newText] of forms) {
          const info = node.attributesMap.get(decorate + attr);
          if (!info) continue;
          result.push({ uri, range: template.toRangeFromOffsets(info.start + decorate.length, info.end), newText });
        }
      });
      if (prop.kind === 'event') continue;
      forEachSpreadObject(template, (tag, obj) => {
        if (!tags.has(tag)) return;
        for (const p of obj.properties) {
          const key = ts.ast.isSpreadAssignment(p) ? undefined : p.name;
          if (!key || !(ts.ast.isIdentifier(key) || ts.ast.isStringLiteral(key)) || key.text !== name) continue;
          // `{ prop }` 需要改成 `{ newName: prop }`
          const newText = ts.ast.isShorthandPropertyAssignment(p) ? (n: string) => `${n}: ${name}` : asCamel;
          result.push({ uri, range: nodeRange(file, key, ts.ast.isStringLiteral(key) ? 1 : 0), newText });
        }
      });
    }
    if (!methods) continue;
    forEachNode(file, (node) => {
      if (!ts.ast.isCallExpression(node) || !ts.ast.isPropertyAccessExpression(node.expression)) return;
      const [arg] = node.arguments;
      if (!methods.has(node.expression.name.text) || !isStringArg(arg) || arg.text !== kebab) return;
      calls.push({ uri, file, receiver: node.expression.expression, arg });
    });
  }

  // 只检查名称匹配的调用，接收者需要是相关的元素
  const matched = await Promise.all(
    calls.map(async ({ receiver }) => isRelated(await project.checker.getTypeAtLocation(receiver))),
  );
  calls.forEach(({ uri, file, arg }, i) => {
    if (matched[i]) result.push({ uri, range: nodeRange(file, arg, 1), newText: asKebab });
  });
  return result;
}

export function getPropRenameEdits(references: PropReference[], newName: string) {
  const changes: Record<string, TextEdit[]> = {};
  for (const { uri, range, newText } of references) (changes[uri] ??= []).push({ range, newText: newText(newName) });
  return changes;
}
