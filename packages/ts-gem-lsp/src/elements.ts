import { camelToKebabCase } from '@mantou/gem/lib/utils';
import type { IAttributeData } from '@mantou/vscode-html-languageservice';
import { getDefaultHTMLDataProvider } from '@mantou/vscode-html-languageservice';
import type { ClassDeclaration, Node, PropertyDeclaration, SourceFile } from 'typescript/unstable/ast';
import {
  isCallExpression,
  isClassDeclaration,
  isDecorator,
  isIdentifier,
  isPropertyDeclaration,
  isStringLiteral,
  SyntaxKind,
} from 'typescript/unstable/ast';
import type { Project, Symbol as TsSymbol, Type } from 'typescript/unstable/async';
import { isLiteralType, isUnionType } from 'typescript/unstable/async';

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
    if (!isDecorator(modifier)) continue;
    const callee = isCallExpression(modifier.expression) ? modifier.expression.expression : modifier.expression;
    if (isIdentifier(callee)) names.push(callee.text);
  }
  return names;
}

export function getTagFromDecorator(node: ClassDeclaration) {
  for (const modifier of node.modifiers ?? []) {
    if (!isDecorator(modifier) || !isCallExpression(modifier.expression)) continue;
    const { expression, arguments: args } = modifier.expression;
    if (isIdentifier(expression) && expression.text === 'customElement' && args[0] && isStringLiteral(args[0])) {
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
    if (!isClassDeclaration(node) || !node.name) return [];
    const tag = getTagFromDecorator(node) ?? (isDep ? rules.findTag(node.name.text) : undefined);
    return tag ? [{ tag, fileName: file.fileName, className: node.name.text, isDep }] : [];
  });
}

/**
 * 项目中定义的所有元素
 *
 * 扫描需要获取全部源文件，元素很少变化，所以先返回上次的结果，同时在后台刷新
 */
export class ElementIndex {
  #rules: ElementDefineRules;
  #cache = new Map<string, { elements?: Map<string, ElementRef>; refreshing?: Promise<Map<string, ElementRef>> }>();

  constructor(rules: ElementDefineRules) {
    this.#rules = rules;
  }

  async get(project: Project) {
    let entry = this.#cache.get(project.id);
    if (!entry) this.#cache.set(project.id, (entry = {}));
    const current = entry;
    current.refreshing ??= this.#scan(project)
      .then((elements) => (current.elements = elements))
      .finally(() => (current.refreshing = undefined));
    return current.elements ?? current.refreshing;
  }

  async #scan(project: Project) {
    const fileNames = (await project.program.getSourceFileNames()).filter((name) => !isLibFile(name));
    const files = await Promise.all(fileNames.map((name) => project.program.getSourceFile(name)));
    const elements = new Map<string, ElementRef>();
    for (const file of files) {
      if (!file) continue;
      for (const ref of findElementRefs(file, this.#rules)) elements.set(ref.tag, ref);
    }
    return elements;
  }
}

async function getUnionValues(type: Type) {
  if (!isUnionType(type)) return;
  const types = await type.getTypes();
  return types.filter(isLiteralType).map((t) => String(t.value));
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

export async function getElementData(project: Project, ref: ElementRef): Promise<ElementData | undefined> {
  const file = await project.program.getSourceFile(ref.fileName);
  const node = file?.statements.find(
    (s): s is ClassDeclaration => isClassDeclaration(s) && s.name?.text === ref.className,
  );
  if (!node?.name) return;

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
    (prop) => prop.valueDeclaration?.kind === SyntaxKind.PropertyDeclaration,
  );
  const declarations = await Promise.all(props.map((prop) => prop.valueDeclaration!.resolve(project)));

  const propEntries = props
    .map((prop, i) => ({ prop, declaration: declarations[i] }))
    .filter((e): e is { prop: TsSymbol; declaration: PropertyDeclaration } => {
      const { declaration } = e;
      return (
        !!declaration && isPropertyDeclaration(declaration) && (ref.isDep || !!getDecoratorNames(declaration).length)
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
