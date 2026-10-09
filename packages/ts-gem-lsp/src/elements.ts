import { camelToKebabCase } from '@mantou/gem/lib/utils';
import type { IAttributeData } from '@mantou/vscode-html-languageservice';
import { getDefaultHTMLDataProvider } from '@mantou/vscode-html-languageservice';
import type { ClassDeclaration, Identifier, Node, PropertyDeclaration, SourceFile } from 'typescript/unstable/ast';
import type { Project, Symbol as TsSymbol, Type } from 'typescript/unstable/async';

import { ts } from './ts';

const defaultDataProvider = getDefaultHTMLDataProvider();

const DEFAULT_ELEMENT_DEFINE_RULES = {
  'Duoyun*Element': 'dy-*',
  '*Element': '*',
};

// 依赖中的声明文件没有装饰器，根据类名推断标签名
export class ElementDefineRules {
  #map = new Map<RegExp, string>();

  constructor(rules: Record<string, string> = {}) {
    Object.entries({ ...DEFAULT_ELEMENT_DEFINE_RULES, ...rules }).forEach(([classNamePattern, tagPattern]) => {
      this.#map.set(new RegExp(classNamePattern.replace('*', '(.*)')), tagPattern.replace('*', '$1'));
    });
  }

  findTag(className: string) {
    for (const [reg, replaceStr] of this.#map) {
      if (reg.exec(className)) return camelToKebabCase(className.replace(reg, replaceStr));
    }
  }
}

export function isDepFile(fileName: string) {
  return ['/node_modules/', '/dist/', '.d.ts'].some((s) => fileName.includes(s));
}

export function getDecoratorNames(node: Node) {
  const names: string[] = [];
  for (const modifier of (node as ClassDeclaration).modifiers ?? []) {
    if (!ts.ast.isDecorator(modifier)) continue;
    const callee = ts.ast.isCallExpression(modifier.expression) ? modifier.expression.expression : modifier.expression;
    if (ts.ast.isIdentifier(callee)) names.push(callee.text);
  }
  return names;
}

export function getTagFromDecorator(node: ClassDeclaration) {
  for (const modifier of node.modifiers ?? []) {
    if (!ts.ast.isDecorator(modifier) || !ts.ast.isCallExpression(modifier.expression)) continue;
    const { expression, arguments: args } = modifier.expression;
    if (
      ts.ast.isIdentifier(expression) &&
      expression.text === 'customElement' &&
      args[0] &&
      ts.ast.isStringLiteral(args[0])
    ) {
      return args[0].text;
    }
  }
}

/** 跨快照使用，只保存纯数据，使用时从当前快照重新获取节点 */
export interface ElementRef {
  tag: string;
  fileName: string;
  className: string;
  isDep: boolean;
}

export interface ElementData {
  node: ClassDeclaration;
  description: string;
  attributes: IAttributeData[];
  /** 属性名对应的字面量联合类型的值 */
  values: Map<string, string[]>;
}

// 编译器内置的 lib 文件不会定义元素，跳过以减少传输
const isLibFile = (fileName: string) => /\/lib\.[\w.]+\.d\.ts$/.test(fileName);

function findElementRefs(file: SourceFile, rules: ElementDefineRules) {
  const isDep = isDepFile(file.fileName);
  return file.statements.flatMap((node): ElementRef[] => {
    if (!ts.ast.isClassDeclaration(node) || !node.name) return [];
    const tag = getTagFromDecorator(node) ?? (isDep ? rules.findTag(node.name.text) : undefined);
    return tag ? [{ tag, fileName: file.fileName, className: node.name.text, isDep }] : [];
  });
}

interface ProjectElements {
  /** 文件中定义的元素 */
  files: Map<string, ElementRef[]>;
  elements: Map<string, ElementRef>;
  /** 修改过的文件 URI */
  changed: Set<string>;
  /** 串行更新，避免并发请求重复扫描 */
  queue: Promise<unknown>;
}

/**
 * 项目中定义的所有元素
 *
 * 宿主在文件修改时调用 `invalidate`，每次请求只重新扫描修改过的文件和新增的文件
 */
export class ElementIndex {
  #getRules: () => ElementDefineRules;
  #rules?: ElementDefineRules;
  #projects = new Map<string, ProjectElements>();

  constructor(getRules: () => ElementDefineRules) {
    this.#getRules = getRules;
  }

  /** 不传 URI 时全部重新扫描 */
  invalidate(uri?: string) {
    if (uri === undefined) return this.#projects.clear();
    for (const state of this.#projects.values()) state.changed.add(uri);
  }

  get(project: Project) {
    const rules = this.#getRules();
    if (rules !== this.#rules) {
      this.#rules = rules;
      this.#projects.clear();
    }
    let state = this.#projects.get(project.id);
    if (!state) {
      state = { files: new Map(), elements: new Map(), changed: new Set(), queue: Promise.resolve() };
      this.#projects.set(project.id, state);
    }
    const result = state.queue.then(() => this.#update(project, state, rules));
    state.queue = result.catch(() => {});
    return result;
  }

  async #update(project: Project, state: ProjectElements, rules: ElementDefineRules) {
    const changed = new Set([...state.changed].map((uri) => ts.api.documentURIToFileName(uri)));
    state.changed.clear();
    const fileNames = (await project.program.getSourceFileNames()).filter((name) => !isLibFile(name));
    const current = new Set<string>(fileNames);
    const removed = [...state.files.keys()].filter((name) => !current.has(name));
    const stale = fileNames.filter((name) => !state.files.has(name) || changed.has(name));
    if (!removed.length && !stale.length) return state.elements;

    for (const name of removed) state.files.delete(name);
    const files = await Promise.all(stale.map((name) => project.program.getSourceFile(name)));
    stale.forEach((name, i) => state.files.set(name, files[i] ? findElementRefs(files[i], rules) : []));
    state.elements = new Map([...state.files.values()].flat().map((ref) => [ref.tag, ref]));
    return state.elements;
  }
}

async function getUnionValues(type: Type) {
  if (!ts.api.isUnionType(type)) return;
  const types = await type.getTypes();
  return types.filter(ts.api.isLiteralType).map((t) => String(t.value));
}

const BUILT_IN_ATTRIBUTES: IAttributeData[] = [
  { name: 'v-if', description: 'Similar to vue `v-if`' },
  { name: 'v-else-if', description: 'Similar to vue `v-else-if`' },
  { name: 'v-else', description: 'Similar to vue `v-else`', valueSet: 'v' },
];

const BUILT_IN_ATTRS_AND_EVENTS = defaultDataProvider
  .provideAttributes('div')
  .map((e) => ({ ...e, name: e.name.replace(/^on/, '@') }));

export function getBuiltInAttributes() {
  return [...BUILT_IN_ATTRIBUTES, ...BUILT_IN_ATTRS_AND_EVENTS];
}

/** 从当前快照获取元素类声明 */
export async function getElementNode(project: Project, ref: ElementRef) {
  const file = await project.program.getSourceFile(ref.fileName);
  return file?.statements.find(
    (s): s is ClassDeclaration & { name: Identifier } => ts.ast.isClassDeclaration(s) && s.name?.text === ref.className,
  );
}

export interface ElementType {
  type: Type;
  symbol?: TsSymbol;
  isBuiltIn: boolean;
  isSVG: boolean;
}

async function getTagNameMapType(project: Project, location: SourceFile, name: string) {
  const symbol = await project.checker.resolveName(name, ts.api.SymbolFlags.Interface, location);
  return symbol && project.checker.getDeclaredTypeOfSymbol(symbol);
}

/**
 * 标签对应的元素类型，内置元素使用 lib 中的 `HTMLElementTagNameMap` `SVGElementTagNameMap`
 */
export async function resolveElementType(
  project: Project,
  location: SourceFile,
  elements: Map<string, ElementRef>,
  tag: string,
): Promise<ElementType | undefined> {
  const { checker } = project;
  const ref = elements.get(tag);
  if (ref) {
    const node = await getElementNode(project, ref);
    if (!node) return;
    const [type, symbol] = await Promise.all([
      checker.getTypeAtLocation(node.name),
      checker.getSymbolAtLocation(node.name),
    ]);
    return { type, symbol, isBuiltIn: false, isSVG: false };
  }
  for (const [mapName, isSVG] of [
    ['HTMLElementTagNameMap', false],
    ['SVGElementTagNameMap', true],
  ] as const) {
    const mapType = await getTagNameMapType(project, location, mapName);
    const type = mapType && (await checker.getTypeOfPropertyOfType(mapType, tag));
    if (type) return { type, symbol: await type.getSymbol(), isBuiltIn: true, isSVG };
  }
}

export async function getElementData(project: Project, ref: ElementRef): Promise<ElementData | undefined> {
  const node = await getElementNode(project, ref);
  if (!node) return;

  const { checker } = project;
  const [classSymbol, classType, stringType, numberType, booleanType] = await Promise.all([
    checker.getSymbolAtLocation(node.name),
    checker.getTypeAtLocation(node.name),
    checker.getStringType(),
    checker.getNumberType(),
    checker.getBooleanType(),
  ]);
  // 继承自 DOM 接口的属性有几百个，获取声明节点需要传输 lib 文件，所以先用节点类型过滤
  const props = (await classType.getApparentProperties()).filter(
    (prop) => prop.valueDeclaration?.kind === ts.ast.SyntaxKind.PropertyDeclaration,
  );
  const declarations = await Promise.all(props.map((prop) => prop.valueDeclaration!.resolve(project)));

  const propEntries = props
    .map((prop, i) => ({ prop, declaration: declarations[i] }))
    .filter((e): e is { prop: TsSymbol; declaration: PropertyDeclaration } => {
      const { declaration } = e;
      return (
        !!declaration &&
        ts.ast.isPropertyDeclaration(declaration) &&
        (ref.isDep || !!getDecoratorNames(declaration).length)
      );
    });

  const attributes: IAttributeData[] = [...BUILT_IN_ATTRIBUTES];
  const values = new Map<string, string[]>();
  await Promise.all(
    propEntries.map(async ({ prop, declaration }) => {
      const [type, description] = await Promise.all([
        declaration.type && checker.getTypeFromTypeNode(declaration.type),
        prop.getDocumentationComment(checker),
      ]);
      const unionValues = type && (await getUnionValues(type));
      const { name } = prop;
      if (unionValues) values.set(name, unionValues);
      if (type?.id === booleanType.id) {
        // 一般是 boolean attribute
        attributes.push({ name, description, valueSet: 'v' }, { name: `?${name}`, description });
      } else if (type?.id === stringType.id || type?.id === numberType.id || unionValues) {
        // 一般是 attribute
        attributes.push({ name, description });
      }
      if (declaration.type?.getText().startsWith('Emitter')) {
        // 自定义事件
        attributes.push({ name: `@${camelToKebabCase(name)}`, description });
      } else {
        // 其他属性都能用 `.` 赋值
        attributes.push({ name: `.${name}`, description });
      }
    }),
  );
  // 添加原生全局事件
  attributes.push(...BUILT_IN_ATTRS_AND_EVENTS.filter((e) => e.name.startsWith('@')));

  const description = classSymbol ? await classSymbol.getDocumentationComment(checker) : '';
  return { node, description, attributes, values };
}
