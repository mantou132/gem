import { camelToKebabCase, kebabToCamelCase } from '@mantou/gem/lib/utils';
import type { HTMLDocument, Node as HtmlNode } from '@mantou/vscode-html-languageservice';
import { getLanguageService } from '@mantou/vscode-html-languageservice';
import type { MethodSignatureDeclaration, Node, SourceFile } from 'typescript/unstable/ast';
import {
  getTokenAtPosition,
  isClassDeclaration,
  isDecorator,
  isMethodDeclaration,
  isMethodSignatureDeclaration,
  isPropertyDeclaration,
  isTemplateSpan,
  SyntaxKind,
} from 'typescript/unstable/ast';
import type { Checker, Project, Symbol as TsSymbol, Type } from 'typescript/unstable/async';
import { isLiteralType, isUnionType } from 'typescript/unstable/async';
import type { CodeAction, Diagnostic } from 'typescript/unstable/vscode';

import type { ElementRef, ElementType } from './elements';
import { getDecoratorNames, getTagFromDecorator, resolveElementType } from './elements';
import type { Template } from './template';
import { findAncestor, toOffset, toPosition } from './template';

const SOURCE = 'gem';
const SUBSTITUTION_CHAR = '_';

export enum DiagnosticCode {
  UnknownTag = 101,
  UnknownProp,
  PropTypeError,
  PropSyntaxError,
  Deprecated,
  NoStyleTag,
  DecoratorSyntaxError,
  SuggestionClassName,
  SuggestionPropOptional,
  // 和 ts-gem-plugin 保持一致
  AttrFormatError = 2552,
}

enum Severity {
  Warning = 2,
  Hint = 4,
}

/** 诊断的 `data` 会在代码操作请求中传回，用于生成修复 */
export type AttrFormatData = { replacement: string };

const UNNECESSARY_TAG = 1;
const DEPRECATED_TAG = 2;

// 未使用的声明：`'xx' is declared but its value is never read.` 等
const UNUSED_CODES = new Set([6133, 6138, 6196]);

const htmlLs = getLanguageService();

const buildInElementNoGlobalAttrPropMap = new Map([
  ['crossorigin', 'crossOrigin'],
  ['rowspan', 'rowSpan'],
  ['colspan', 'colSpan'],
  // <input> list: string
  ['list', 'ariaLabelledby'],
]);

const globalAttrPropMap = new Map([['contenteditable', 'contentEditable']]);

const globalEnumeratedBooleanAttr = new Map([
  ['draggable', []],
  ['spellcheck', []],
  ['contenteditable', ['plaintext-only']],
]);

const stringProps = new Set([
  'class',
  'style',
  'part',
  'exportparts',
  'accesskey',
  'xmlns',
  'viewBox',
  'ariaLabelledby',
]);

const ariaBooleanProps = new Set([
  'ariaAtomic',
  'ariaBusy',
  'ariaChecked',
  'ariaDisabled',
  'ariaExpanded',
  'ariaGrabbed',
  'ariaHidden',
  'ariaModal',
  'ariaMultiline',
  'ariaMultiselectable',
  'ariaReadonly',
  'ariaRequired',
  'ariaPressed',
  'ariaSelected',
]);

/** 从属性键值字符串上解析出不包含装饰符的名称 */
function parseAttrName(text: string) {
  const attr = text.split('=')[0];
  const decorated = attr.charCodeAt(0) < 65;
  return { attr: decorated ? attr.slice(1) : attr, decorate: decorated ? attr[0] : '' };
}

function getPropName(attr: string, isBuiltIn: boolean) {
  if (attr.startsWith('data-')) return attr;
  return (
    globalAttrPropMap.get(attr) ||
    (isBuiltIn ? buildInElementNoGlobalAttrPropMap.get(attr) : undefined) ||
    kebabToCamelCase(attr)
  );
}

function getPrevSibling(vHtml: HTMLDocument, node: HtmlNode) {
  const siblings = node.parent?.children ?? vHtml.roots;
  return siblings[siblings.indexOf(node) - 1];
}

function forEachHtmlNode(roots: HtmlNode[], fn: (node: HtmlNode) => void) {
  for (const node of roots) {
    fn(node);
    forEachHtmlNode(node.children, fn);
  }
}

/**
 * API 没有 `getUnionType`，用候选类型列表表示联合类型：可赋值给其中任意一个即可
 */
type TypeList = Type[];

async function isAssignableToAny(checker: Checker, source: Type, targets: TypeList): Promise<boolean> {
  if (isUnionType(source)) {
    const types = await source.getTypes();
    const results = await Promise.all(types.map((t) => isAssignableToAny(checker, t, targets)));
    return results.every(Boolean);
  }
  const results = await Promise.all(targets.map((target) => checker.isTypeAssignableTo(source, target)));
  return results.some(Boolean);
}

async function getLiteralValues(type: Type) {
  if (isLiteralType(type)) return [String(type.value)];
  if (!isUnionType(type)) return [];
  return (await type.getTypes()).filter(isLiteralType).map((t) => String(t.value));
}

type DiagnosticElementType = ElementType & { deprecated: boolean };

/** 单次诊断中共享的类型和元素信息 */
class DiagnosticContext {
  readonly project: Project;
  readonly checker: Checker;
  readonly file: SourceFile;
  #elements: Map<string, ElementRef>;
  #elementTypes = new Map<string, Promise<DiagnosticElementType | undefined>>();
  #primitive?: Promise<Record<'string' | 'number' | 'boolean' | 'undefined' | 'null' | 'any', Type>>;

  constructor(project: Project, file: SourceFile, elements: Map<string, ElementRef>) {
    this.project = project;
    this.checker = project.checker;
    this.file = file;
    this.#elements = elements;
  }

  hasElement(tag: string) {
    return this.#elements.has(tag);
  }

  get primitive() {
    const { checker } = this;
    this.#primitive ??= Promise.all([
      checker.getStringType(),
      checker.getNumberType(),
      checker.getBooleanType(),
      checker.getUndefinedType(),
      checker.getNullType(),
      checker.getAnyType(),
    ]).then(([string, number, boolean, undefinedType, nullType, any]) => ({
      string,
      number,
      boolean,
      undefined: undefinedType,
      null: nullType,
      any,
    }));
    return this.#primitive;
  }

  async #isDeprecated(symbol: TsSymbol | undefined) {
    if (!symbol) return false;
    const tags = await symbol.getJsDocTags(this.checker);
    return tags.some(({ name }) => name === 'deprecated');
  }

  async isPropDeprecated(type: Type, propName: string) {
    return this.#isDeprecated(await type.getProperty(propName));
  }

  getElementType(tag: string) {
    let result = this.#elementTypes.get(tag);
    if (!result) {
      result = this.#resolveElementType(tag);
      this.#elementTypes.set(tag, result);
    }
    return result;
  }

  async #resolveElementType(tag: string): Promise<DiagnosticElementType | undefined> {
    const elementType = await resolveElementType(this.project, this.file, this.#elements, tag);
    if (!elementType) return;
    const deprecated = !elementType.isBuiltIn && (await this.#isDeprecated(elementType.symbol));
    return { ...elementType, deprecated };
  }

  async #getEmitterHandleType(classType: Type, propType: Type | undefined) {
    const { checker } = this;
    // `Emitter` 签名中类型参数 `_Listener` 的默认值
    const [signature] = (await (await propType?.getNonNullableType())?.getCallSignatures()) ?? [];
    const [typeParameter] = (await signature?.getTypeParameters()) ?? [];
    const listenerType = typeParameter && (await checker.getDefaultFromTypeParameter(typeParameter));
    if (listenerType) return listenerType;
    const addEventListener = await classType.getProperty('addEventListener');
    const declarations = await Promise.all(
      (addEventListener?.declarations ?? []).map((handle) => handle.resolve(this.project)),
    );
    const declaration = declarations.find(
      (decl): decl is MethodSignatureDeclaration =>
        !!decl && isMethodSignatureDeclaration(decl) && !decl.typeParameters,
    );
    const listener = declaration?.parameters[1];
    return listener ? checker.getTypeAtLocation(listener) : (await this.primitive).any;
  }

  async getPropTypes(classType: Type, propName: string, isEvent: boolean): Promise<TypeList | undefined> {
    const primitive = await this.primitive;
    if (propName.startsWith('data-') || stringProps.has(propName)) return [primitive.string];
    if (propName === 'tabindex') return [primitive.number];
    if (ariaBooleanProps.has(propName)) return [primitive.string, primitive.boolean, primitive.undefined];
    const propType = await this.checker.getTypeOfPropertyOfType(classType, propName);
    if (!isEvent) return propType && [propType];
    return [await this.#getEmitterHandleType(classType, propType), primitive.undefined];
  }

  /** 属性值插值表达式的类型 */
  async getSpanType(template: Template, attrNameEnd: number) {
    // 跳过 `="${`
    const token = getTokenAtPosition(this.file, template.fromVirtualOffset(attrNameEnd + 4));
    const span = findAncestor(token, isTemplateSpan);
    return span && this.checker.getTypeAtLocation(span.expression);
  }
}

async function checkAttribute(
  ctx: DiagnosticContext,
  template: Template,
  vHtml: HTMLDocument,
  node: HtmlNode,
  elementType: DiagnosticElementType,
  attributeName: string,
  { value, start, end }: { value: string | null; start: number; end: number },
): Promise<Diagnostic[]> {
  const { checker } = ctx;
  const primitive = await ctx.primitive;
  const hasValueSpan = !!value?.startsWith(SUBSTITUTION_CHAR) || !!value?.startsWith(`"${SUBSTITUTION_CHAR}`);
  const { attr, decorate } = parseAttrName(attributeName);
  const propName = getPropName(attr, elementType.isBuiltIn);
  const [propTypes, deprecated] = await Promise.all([
    ctx.getPropTypes(elementType.type, propName, decorate === '@'),
    ctx.isPropDeprecated(elementType.type, propName),
  ]);
  const range = template.toRangeFromOffsets(start, end);
  const result: Diagnostic[] = [];

  if (deprecated) {
    result.push({
      range,
      severity: Severity.Hint,
      tags: [DEPRECATED_TAG],
      code: DiagnosticCode.Deprecated,
      source: SOURCE,
      message: `Deprecated prop '${attr}'`,
    });
  }

  const typeText = propTypes?.length === 1 ? await checker.typeToString(propTypes[0]) : undefined;
  const report = (code = DiagnosticCode.PropTypeError, message?: string, data?: AttrFormatData) => {
    result.push({
      range,
      severity: Severity.Warning,
      code,
      source: SOURCE,
      message:
        message ?? (typeText ? `'${attributeName}' not satisfied '${typeText}'` : `'${attributeName}' type error`),
      data,
    });
    return result;
  };

  if (template.tagName === 'raw') {
    if (decorate) return report(DiagnosticCode.PropSyntaxError, `Raw HTML templates only support attributes`);
    if (hasValueSpan) {
      return report(
        DiagnosticCode.PropSyntaxError,
        `Please wrap the raw html template attribute value with "" to avoid parsing errors when the value is an empty string`,
      );
    }
  }

  if (attributeName === 'v-else-if' || attributeName === 'v-else') {
    const prev = getPrevSibling(vHtml, node);
    if (!prev?.attributesMap.has('v-if') && !prev?.attributesMap.has('v-else-if')) {
      return report(DiagnosticCode.PropSyntaxError, `'${attr}' syntax error`);
    }
  }

  if (attributeName === 'v-if' || attributeName === 'v-else-if') {
    const spanType = hasValueSpan && (await ctx.getSpanType(template, end));
    if (!spanType || !(await checker.isTypeAssignableTo(spanType, primitive.boolean))) report();
    return result;
  }

  if (attributeName === 'v-else') {
    if (value !== null) report();
    return result;
  }

  // SVG 大小写敏感
  if (!elementType.isSVG && decorate === '' && attributeName !== camelToKebabCase(attr)) {
    // <my-element myProp="xx">
    const suggestion = elementType.isBuiltIn ? attr.toLowerCase() : camelToKebabCase(attr);
    return report(DiagnosticCode.AttrFormatError, `Consider using '${suggestion}'`, { replacement: suggestion });
  }

  if (!propTypes) {
    // SVG 元素有很多 css 属性，所以不检查
    if (!elementType.isSVG && decorate !== '@') {
      // <div unknown>
      report(DiagnosticCode.UnknownProp, `Unknown property '${attr}'`);
    }
    return result;
  }

  const enumeratedValues = globalEnumeratedBooleanAttr.get(attr);
  if (enumeratedValues && (decorate === '?' || value === null)) {
    // <div ?draggable=${xx}> <div draggable>
    return report(DiagnosticCode.PropSyntaxError, `Consider using '${camelToKebabCase(attr)}', must has value`);
  }

  if (value === null) {
    if (decorate) {
      // <div ?hidden>
      report(DiagnosticCode.PropSyntaxError, `Consider using '${camelToKebabCase(attr)}'`);
    } else if (!(await isAssignableToAny(checker, primitive.boolean, propTypes))) {
      // <div class>
      report();
    }
    return result;
  }

  if (hasValueSpan) {
    const spanType = await ctx.getSpanType(template, end);
    if (!spanType) return result;
    switch (decorate) {
      case '?':
        // <div ?hidden=${"string"}>
        if (!(await isAssignableToAny(checker, spanType, [primitive.boolean, primitive.undefined, primitive.null]))) {
          report();
        }
        return result;
      case '.':
      case '@':
        // <div .hidden=${"string"}> <div @keydown=${"string"}>
        if (!(await isAssignableToAny(checker, spanType, propTypes))) report();
        return result;
      default: {
        // <div hidden=${"string"}>
        const nullable = [...propTypes, primitive.null, primitive.undefined];
        if (
          !(await isAssignableToAny(checker, spanType, nullable)) &&
          (!(await isAssignableToAny(checker, primitive.string, propTypes)) ||
            !(await checker.isTypeAssignableTo(spanType, primitive.string)))
        ) {
          report();
        }
        return result;
      }
    }
  }

  const valueLetter = value.startsWith('"') || value.startsWith("'") ? value.slice(1, -1) : value;
  if (decorate) {
    // <div ?hidden="">
    return report(DiagnosticCode.PropSyntaxError, `Consider using '${camelToKebabCase(attr)}'`);
  }
  if (enumeratedValues) {
    const values = ['true', 'false', ...enumeratedValues];
    // <div draggable="string">
    if (!values.includes(valueLetter)) report(DiagnosticCode.PropTypeError, `Must be ${values.join(', ')}`);
    return result;
  }
  // 静态值可以是字符串、数字或者字面量类型中的值
  const isNumber = valueLetter !== '' && !Number.isNaN(Number(valueLetter));
  const literalValues = (await Promise.all(propTypes.map(getLiteralValues))).flat();
  const valid =
    literalValues.includes(valueLetter) ||
    (await isAssignableToAny(checker, primitive.string, propTypes)) ||
    (isNumber && (await isAssignableToAny(checker, primitive.number, propTypes)));
  // <div innerText="">
  if (!valid) report();
  return result;
}

async function checkNode(
  ctx: DiagnosticContext,
  template: Template,
  vHtml: HTMLDocument,
  node: HtmlNode,
): Promise<Diagnostic[]> {
  const tag = node.tag!;
  const tagRange = (start: number) => template.toRangeFromOffsets(start, start + tag.length);

  // 检查自定义元素是否定义
  if (tag.includes('-') && !ctx.hasElement(tag)) {
    return [
      {
        range: tagRange(node.start + 1),
        severity: Severity.Warning,
        code: DiagnosticCode.UnknownTag,
        source: SOURCE,
        message: `Unknown element tag '${tag}'`,
      },
    ];
  }

  const elementType = await ctx.getElementType(tag);
  if (!elementType) return [];

  const result: Diagnostic[] = [];
  // 检查元素是否弃用
  if (elementType.deprecated) {
    for (const start of [node.start + 1, node.endTagStart && node.endTagStart + 2]) {
      if (!start) continue;
      result.push({
        range: tagRange(start),
        severity: Severity.Hint,
        tags: [DEPRECATED_TAG],
        code: DiagnosticCode.Deprecated,
        source: SOURCE,
        message: `Deprecated tag '${tag}'`,
      });
    }
  }

  const attributes = [...node.attributesMap].filter(([name]) => !name.startsWith(SUBSTITUTION_CHAR));
  const attributeResults = await Promise.all(
    attributes.map(([name, info]) => checkAttribute(ctx, template, vHtml, node, elementType, name, info)),
  );
  return [...result, ...attributeResults.flat()];
}

export async function getHtmlDiagnostics(
  project: Project,
  file: SourceFile,
  templates: Template[],
  elements: Map<string, ElementRef>,
): Promise<Diagnostic[]> {
  const ctx = new DiagnosticContext(project, file, elements);
  const results = await Promise.all(
    templates.map((template) => {
      const vHtml = htmlLs.parseHTMLDocument(template.doc);
      const nodes: HtmlNode[] = [];
      forEachHtmlNode(vHtml.roots, (node) => node.tag && nodes.push(node));
      return Promise.all(nodes.map((node) => checkNode(ctx, template, vHtml, node)));
    }),
  );
  return results.flat(2);
}

function nodeRange(file: SourceFile, node: Node) {
  return { start: toPosition(file.text, node.getStart(file)), end: toPosition(file.text, node.end) };
}

/** 元素定义类的建议 */
export function getElementClassDiagnostics(file: SourceFile): Diagnostic[] {
  const result: Diagnostic[] = [];
  for (const node of file.statements) {
    if (!isClassDeclaration(node) || !getTagFromDecorator(node)) continue;

    if (node.name && !node.name.text.endsWith('Element')) {
      result.push({
        range: nodeRange(file, node.name),
        severity: Severity.Hint,
        code: DiagnosticCode.SuggestionClassName,
        source: SOURCE,
        message: 'Element definition class suggests the suffix to use `Element`',
      });
    }

    const isShadowDom = getDecoratorNames(node).includes('shadow');
    for (const member of node.members) {
      if (!isPropertyDeclaration(member) || !member.modifiers) continue;
      const decorators = getDecoratorNames(member);

      if (
        decorators.includes('property') &&
        member.postfixToken?.kind !== SyntaxKind.QuestionToken &&
        !member.initializer
      ) {
        result.push({
          range: nodeRange(file, member),
          severity: Severity.Hint,
          code: DiagnosticCode.SuggestionPropOptional,
          source: SOURCE,
          message: 'Custom element property should be optional',
        });
      }

      if (!decorators.includes('slot') && !decorators.includes('part')) continue;
      const missStaticKeyword = member.modifiers.every((e) => e.kind !== SyntaxKind.StaticKeyword);
      if (missStaticKeyword || !isShadowDom) {
        result.push({
          range: nodeRange(file, member),
          severity: Severity.Warning,
          code: DiagnosticCode.DecoratorSyntaxError,
          source: SOURCE,
          message: missStaticKeyword
            ? 'Use static field for `@part` and `@slot`'
            : 'Not available on light dom `@part` and `@slot`',
        });
      }
    }
  }
  return result;
}

/**
 * 装饰器会使用被装饰的成员和元素类，过滤掉 TypeScript 的未使用提示
 */
export function isUnusedDecoratedDiagnostic(file: SourceFile, diagnostic: Diagnostic) {
  const isUnused =
    diagnostic.severity === Severity.Hint &&
    (diagnostic.tags?.includes(UNNECESSARY_TAG) || UNUSED_CODES.has(Number(diagnostic.code)));
  if (!isUnused) return false;

  const declaration = getTokenAtPosition(file, toOffset(file.text, diagnostic.range.start)).parent;
  if (!declaration) return false;
  if (isClassDeclaration(declaration)) return !!getTagFromDecorator(declaration);
  if (isMethodDeclaration(declaration) || isPropertyDeclaration(declaration)) {
    return !!declaration.modifiers?.some(isDecorator);
  }
  return false;
}

/** 属性名格式错误的快速修复 */
export function getAttrFormatFixes(uri: string, diagnostics: readonly Diagnostic[]): CodeAction[] {
  return diagnostics
    .filter((d) => d.source === SOURCE && d.code === DiagnosticCode.AttrFormatError && d.data)
    .map((diagnostic) => {
      const { replacement } = diagnostic.data as AttrFormatData;
      return {
        title: `Convert attribute to '${replacement}'`,
        kind: 'quickfix',
        diagnostics: [diagnostic],
        isPreferred: true,
        edit: { changes: { [uri]: [{ range: diagnostic.range, newText: replacement }] } },
      };
    });
}
