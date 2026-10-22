import { camelToKebabCase } from '@mantou/gem/lib/utils';
import type {
  ClassDeclaration,
  ClassElement,
  Expression,
  Node,
  ParameterDeclaration,
  SourceFile,
} from 'tsrs/unstable/ast';
import {
  isCallExpression,
  isClassDeclaration,
  isConstructorDeclaration,
  isDecorator,
  isExpressionWithTypeArguments,
  isGetAccessorDeclaration,
  isIdentifier,
  isMethodDeclaration,
  isPropertyDeclaration,
  isSetAccessorDeclaration,
  SyntaxKind,
} from 'tsrs/unstable/ast';
import type { ModuleResolver, Project } from 'tsrs/unstable/sync';
import { API, ModuleKind, ModuleResolutionKind, SymbolFlags } from 'tsrs/unstable/sync';

import {
  getJsDoc,
  getJsDocParams,
  getJsDocs,
  getJsDocTag,
  getJsDocText,
  getModifiers,
  hasModifier,
  isPrivateId,
} from './lib/utils';

interface StaticProperty {
  getter?: boolean;
  setter?: boolean;
  name: string;
  deprecated?: boolean;
  slot?: string;
  part?: string;
  type?: string;
  description?: string;
}

interface StaticMethod {
  name: string;
  deprecated?: boolean;
  type?: string;
  description?: string;
}

interface Property {
  getter?: boolean;
  setter?: boolean;
  name: string;
  reactive: boolean;
  deprecated?: boolean;
  attribute?: string;
  slot?: string;
  part?: string;
  cssState?: string;
  isRef?: boolean;
  event?: string;
  isGlobalEvent?: boolean;
  type?: string;
  description?: string;
}

interface Method {
  name: string;
  deprecated?: boolean;
  event?: string;
  isGlobalEvent?: boolean;
  type?: string;
  description?: string;
}

interface ConstructorParam {
  name: string;
  type?: string;
  description?: string;
}

export interface ElementDetail {
  shadow: boolean;
  name: string;
  constructorName: string;
  constructorExtendsName: string;
  constructorParams: ConstructorParam[];
  staticProperties: StaticProperty[];
  staticMethods: StaticMethod[];
  properties: Property[];
  methods: Method[];
  description?: string;
  attributes: string[];
  events: string[];
  slots: string[];
  parts: string[];
  cssStates: string[];
  extend?: ElementDetail;
}

export interface ExportDetail {
  name: string;
  kindName: string;
  type: string;
  deprecated?: boolean;
  description?: string;
}

const shadowDecoratorName = ['shadow'];
const elementDecoratorName = ['customElement'];
const attrDecoratorName = ['attribute', 'boolattribute', 'numattribute'];
const propDecoratorName = ['property'];
const stateDecoratorName = ['state'];
const slotDecoratorName = ['slot'];
const partDecoratorName = ['part'];
const refDecoratorName = ['refobject'];
const eventDecoratorName = ['emitter', 'globalemitter'];
const globalEventDecoratorName = ['globalemitter'];
const lifecyclePopsOrMethods = ['state', 'willMount', 'render', 'mounted', 'shouldUpdate', 'updated', 'unmounted'];

const compilerOptions = {
  module: ModuleKind.ESNext,
  moduleResolution: ModuleResolutionKind.Bundler,
  skipLibCheck: true,
  types: [],
  // 并行解析模块时，`resolveModuleName` 回调中的嵌套请求可能得到其他请求的结果，导致导入的符号解析失败，
  // tsrs 升级到包含 https://github.com/microsoft/TypeScript/pull/64639 的版本后移除
  singleThreaded: true,
};

function getDecorators(node: Node) {
  return getModifiers(node)
    .filter(isDecorator)
    .map(({ expression }) => {
      const call = isCallExpression(expression) ? expression : undefined;
      const callee = call ? call.expression : expression;
      return { name: isIdentifier(callee) ? callee.text : '', args: call?.arguments ?? [] };
    });
}

function getTypeString({ checker }: Project, node: Node) {
  const { name } = node as { name?: Node };
  return checker.typeToString(checker.getTypeAtLocation(name ?? node), node);
}

/** 优先使用声明的类型 */
function getTypeText(project: Project, node: ClassElement | ParameterDeclaration) {
  const { type } = node as { type?: Node };
  return type?.getText() || getTypeString(project, node);
}

function getExtendsClassDetail(project: Project, expression: Expression) {
  const { checker } = project;
  let symbol = checker.getSymbolAtLocation(expression);
  if (symbol && symbol.flags & SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
  const declaration = symbol?.valueDeclaration?.resolve(project);
  // 声明文件中没有装饰器
  if (!declaration || !isClassDeclaration(declaration) || declaration.getSourceFile().isDeclarationFile) return;
  return parseElement(project, declaration);
}

function parseElement(project: Project, declaration: ClassDeclaration) {
  const detail: ElementDetail = {
    name: '',
    shadow: false,
    constructorName: '',
    constructorExtendsName: '',
    constructorParams: [],
    staticProperties: [],
    staticMethods: [],
    properties: [],
    methods: [],
    attributes: [],
    cssStates: [],
    events: [],
    parts: [],
    slots: [],
  };
  const className = declaration.name?.text;
  const heritage = declaration.heritageClauses?.find((e) => e.token === SyntaxKind.ExtendsKeyword)?.types[0];
  const cons = declaration.members.find(isConstructorDeclaration);
  const appendElementDesc = (desc = '') =>
    (detail.description = (detail.description ? `${detail.description}\n\n` : '') + desc);
  getJsDocs(declaration).forEach((jsDoc) => appendElementDesc(getJsDocText(jsDoc)));

  if (className && heritage && isExpressionWithTypeArguments(heritage)) {
    const constructorExtendsName = heritage.getText();
    if (constructorExtendsName !== 'GemElement') {
      detail.extend = getExtendsClassDetail(project, heritage.expression);
    }
    detail.constructorName = className;
    detail.constructorExtendsName = constructorExtendsName;
    if (cons) {
      getJsDocs(cons).forEach((jsDoc) => appendElementDesc(getJsDocText(jsDoc)));
      const params = new Map(getJsDocParams(cons).map(({ name, comment }) => [name, comment]));
      detail.constructorParams = cons.parameters.map((param) => ({
        name: param.name.getText(),
        type: getTypeText(project, param),
        description: params.get(param.name.getText()),
      }));
    }
  }

  for (const member of declaration.members) {
    const isMethod = isMethodDeclaration(member);
    const getter = isGetAccessorDeclaration(member);
    const setter = isSetAccessorDeclaration(member);
    if (!isMethod && !getter && !setter && !isPropertyDeclaration(member)) continue;
    // 重载只保留实现
    if (isMethod && !member.body) continue;
    const name = member.name.getText();
    if (isPrivateId(name)) continue;
    const decoratorNames = getDecorators(member).map((e) => e.name);
    const kebabName = camelToKebabCase(name);

    if (hasModifier(member, SyntaxKind.StaticKeyword)) {
      if (isMethod) {
        detail.staticMethods.push({ name, type: getTypeString(project, member), ...getJsDoc(member) });
      } else if (decoratorNames.some((e) => slotDecoratorName.includes(e))) {
        detail.slots.push(kebabName);
      } else if (decoratorNames.some((e) => partDecoratorName.includes(e))) {
        detail.parts.push(kebabName);
      } else {
        detail.staticProperties.push({
          name,
          type: getTypeString(project, member),
          getter,
          setter,
          ...getJsDoc(member),
        });
      }
      continue;
    }

    if (lifecyclePopsOrMethods.includes(name)) continue;

    if (isMethod) {
      const method: Method = { name, type: getTypeText(project, member), ...getJsDoc(member) };
      detail.methods.push(method);
      for (const decoratorName of decoratorNames) {
        if (eventDecoratorName.includes(decoratorName)) {
          method.event = kebabName;
          detail.events.push(method.event);
        }
        if (globalEventDecoratorName.includes(decoratorName)) {
          method.isGlobalEvent = true;
        }
      }
      continue;
    }

    const prop: Property = {
      name,
      reactive: false,
      type: getTypeText(project, member),
      getter,
      setter,
      ...getJsDoc(member),
    };
    detail.properties.push(prop);
    for (const decoratorName of decoratorNames) {
      if (attrDecoratorName.includes(decoratorName)) {
        prop.reactive = true;
        prop.attribute = kebabName;
        detail.attributes.push(prop.attribute);
      } else if (propDecoratorName.includes(decoratorName)) {
        prop.reactive = true;
      } else if (stateDecoratorName.includes(decoratorName)) {
        prop.cssState = kebabName;
        detail.cssStates.push(prop.cssState);
      } else if (slotDecoratorName.includes(decoratorName)) {
        prop.slot = kebabName;
        detail.slots.push(prop.slot);
      } else if (partDecoratorName.includes(decoratorName)) {
        prop.part = kebabName;
        detail.parts.push(prop.part);
      } else if (refDecoratorName.includes(decoratorName)) {
        prop.isRef = true;
      } else if (eventDecoratorName.includes(decoratorName)) {
        prop.event = kebabName;
        detail.events.push(prop.event);
      }
      if (globalEventDecoratorName.includes(decoratorName)) {
        prop.isGlobalEvent = true;
      }
    }
  }

  detail.shadow = getDecorators(declaration).some((e) => shadowDecoratorName.includes(e.name));

  return detail;
}

function getElements(project: Project, file: SourceFile) {
  const result: ElementDetail[] = [];
  for (const declaration of file.statements) {
    if (!isClassDeclaration(declaration)) continue;
    const elementDecorator = getDecorators(declaration).find((e) => elementDecoratorName.includes(e.name));
    const elementTag =
      elementDecorator?.args[0]?.getText().replace(/('|"|`)?(\S*)\1/, '$2') ||
      getJsDocTag(declaration, 'customElement');
    if (!elementTag) continue;
    const detail = { ...parseElement(project, declaration), name: elementTag };
    if (!detail.constructorName.startsWith('_')) result.push(detail);
  }
  return result;
}

function getExports(project: Project, file: SourceFile) {
  const { checker } = project;
  const moduleSymbol = checker.getSymbolAtLocation(file);
  if (!moduleSymbol) return [];
  // 按照声明顺序
  const symbols = checker
    .getExportsOfModule(moduleSymbol)
    .toSorted((a, b) => (a.declarations[0]?.index ?? 0) - (b.declarations[0]?.index ?? 0));
  return symbols.flatMap((symbol): ExportDetail[] => {
    // 重新导出的声明在其他文件中
    const target = symbol.flags & SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
    const declarations = target.declarations.flatMap((e) => e.resolve(project) ?? []);
    if (!declarations.length) return [];
    // 只支持 1 份有效的 jsDoc
    const jsDoc = declarations.map(getJsDoc).find((e) => e.deprecated || e.description);
    return [
      {
        name: symbol.name,
        kindName: SyntaxKind[declarations[0].kind],
        type: declarations
          .map((declaration) => getTypeString(project, declaration))
          .filter((e) => !!e)
          .join(';'),
        deprecated: jsDoc?.deprecated ?? false,
        description: jsDoc?.description ?? '',
      },
    ];
  });
}

export interface AnalyzerOptions {
  /** 默认为 `process.cwd()` */
  cwd?: string;
  /**
   * 把导入的模块解析到源码文件，没有返回时使用默认解析；
   * 依赖中的声明文件没有装饰器，继承依赖中的元素时需要分析源码
   */
  resolveModule?: (specifier: string, containingDirectory: string) => string | undefined;
}

/** 使用 tsrs 分析文件，用完后需要调用 `close` 结束 tsrs 进程 */
export class Analyzer {
  #api: API;
  #moduleResolver?: ModuleResolver;

  constructor({ cwd, resolveModule }: AnalyzerOptions = {}) {
    this.#api = new API({ cwd });
    if (!resolveModule) return;
    const defaultResolver = this.#api.createModuleResolver(compilerOptions);
    this.#moduleResolver = this.#api.createModuleResolver(compilerOptions, {
      // 回调没有返回时模块不会被解析，所以需要使用默认解析
      resolveModuleName: (specifier, containingDirectory, mode) => ({
        resolvedFileName:
          resolveModule(specifier, containingDirectory) ||
          defaultResolver.resolveModuleName(specifier, containingDirectory, mode).resolvedModule?.resolvedFileName,
      }),
    });
  }

  /** 每次分析都读取最新的文件内容 */
  analyze(fileName: string) {
    const snapshot = this.#api.createSnapshot({
      createPrograms: [{ rootFiles: [fileName], compilerOptions, options: { moduleResolver: this.#moduleResolver } }],
    });
    try {
      const project = snapshot.getProject(snapshot.operation.createdPrograms[0].id)!;
      const file = project.program.getSourceFile(fileName);
      if (!file) throw new Error(`Cannot find file: ${fileName}`);
      return { elements: getElements(project, file), exports: getExports(project, file) };
    } finally {
      snapshot.dispose();
    }
  }

  close() {
    this.#api.close();
  }
}
