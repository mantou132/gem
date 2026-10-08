import { TextDocument } from '@mantou/vscode-html-languageservice';
import type { Node, NoSubstitutionTemplateLiteral, SourceFile, TemplateExpression } from 'typescript/unstable/ast';
import {
  getTokenAtPosition,
  isCallExpression,
  isIdentifier,
  isNoSubstitutionTemplateLiteral,
  isObjectLiteralExpression,
  isPropertyAssignment,
  isTaggedTemplateExpression,
  isTemplateExpression,
} from 'typescript/unstable/ast';
import type { Position, Range } from 'typescript/unstable/vscode';

const TEMPLATE_TAGS = {
  html: new Set(['html', 'raw', 'h']),
  css: new Set(['css', 'styled']),
};

const SUBSTITUTION_CHAR = '_';

// 只有声明的样式需要包裹在规则中才能解析
const DECLARATIONS_PREFIX = '.parent { ';
const DECLARATIONS_SUFFIX = ' }';

export type TemplateKind = keyof typeof TEMPLATE_TAGS;

type TemplateLiteralNode = NoSubstitutionTemplateLiteral | TemplateExpression;

export function toOffset(text: string, { line, character }: Position) {
  let offset = 0;
  for (let i = 0; i < line; i++) offset = text.indexOf('\n', offset) + 1;
  return offset + character;
}

export function toPosition(text: string, offset: number): Position {
  const lineStart = text.lastIndexOf('\n', offset - 1) + 1;
  let line = 0;
  for (let i = text.indexOf('\n'); i !== -1 && i < lineStart; i = text.indexOf('\n', i + 1)) line++;
  return { line, character: offset - lineStart };
}

export function findAncestor<T extends Node>(node: Node | undefined, test: (node: Node) => node is T) {
  for (let n = node; n; n = n.parent) if (test(n)) return n;
}

function isTemplateLiteralNode(node: Node): node is TemplateLiteralNode {
  return isNoSubstitutionTemplateLiteral(node) || isTemplateExpression(node);
}

function isCssCall(node: Node) {
  return isCallExpression(node) && isIdentifier(node.expression) && node.expression.text === 'css';
}

/**
 * - html`` raw`` h`` css`` styled``
 * - css(``)
 * - css({ key: `` })
 */
function getTemplateInfo(node: TemplateLiteralNode) {
  const { parent } = node;
  if (isTaggedTemplateExpression(parent) && isIdentifier(parent.tag)) {
    const tagName = parent.tag.text;
    const kind = (Object.keys(TEMPLATE_TAGS) as TemplateKind[]).find((k) => TEMPLATE_TAGS[k].has(tagName));
    return kind && { kind, tagName, declarationsOnly: tagName === 'styled' };
  }
  if (isCssCall(parent)) return { kind: 'css' as const, tagName: 'css', declarationsOnly: false };
  if (isPropertyAssignment(parent) && isObjectLiteralExpression(parent.parent) && isCssCall(parent.parent.parent)) {
    return { kind: 'css' as const, tagName: 'css', declarationsOnly: true };
  }
}

/** 虚拟文档和源文件之间的位置映射 */
export interface VirtualDocument {
  readonly doc: TextDocument;
  readonly fileName: string;
  toVirtualPosition(offset: number): Position;
  toRange(virtualRange: Range): Range;
}

/**
 * 模板字符串对应的虚拟文档，插值替换成等长的占位字符，保持偏移一致
 */
export class Template implements VirtualDocument {
  readonly kind: TemplateKind;
  /** 模板标签名，例如 `html` `raw` */
  readonly tagName: string;
  readonly node: TemplateLiteralNode;
  readonly file: SourceFile;
  readonly fileName: string;
  readonly doc: TextDocument;
  /** 模板内容在源文件中的起始偏移（反引号之后） */
  readonly #start: number;
  readonly #prefix: string;
  /** 插值表达式的范围，属于 TypeScript 代码 */
  readonly #substitutions: [number, number][] = [];

  constructor(file: SourceFile, node: TemplateLiteralNode, info: NonNullable<ReturnType<typeof getTemplateInfo>>) {
    this.file = file;
    this.fileName = file.fileName;
    this.kind = info.kind;
    this.tagName = info.tagName;
    this.node = node;
    this.#start = node.getStart(file) + 1;
    this.#prefix = info.declarationsOnly ? DECLARATIONS_PREFIX : '';
    const chars = file.text.slice(this.#start, node.end - 1).split('');
    if (isTemplateExpression(node)) {
      let substitutionStart = node.head.end - 2;
      for (const span of node.templateSpans) {
        const substitutionEnd = span.literal.getStart(file) + 1;
        this.#substitutions.push([substitutionStart + 2, substitutionEnd - 1]);
        for (let i = substitutionStart; i < substitutionEnd; i++) {
          if (chars[i - this.#start] !== '\n') chars[i - this.#start] = SUBSTITUTION_CHAR;
        }
        substitutionStart = span.literal.end - 2;
      }
    }
    const suffix = info.declarationsOnly ? DECLARATIONS_SUFFIX : '';
    const text = `${this.#prefix}${chars.join('')}${suffix}`;
    this.doc = TextDocument.create(`gem-template://${this.#start}.${info.kind}`, info.kind, 0, text);
  }

  contains(offset: number) {
    if (offset < this.#start || offset >= this.node.end) return false;
    return !this.#substitutions.some(([start, end]) => offset >= start && offset <= end);
  }

  toVirtualOffset(offset: number) {
    return offset - this.#start + this.#prefix.length;
  }

  fromVirtualOffset(virtualOffset: number) {
    return virtualOffset - this.#prefix.length + this.#start;
  }

  toVirtualPosition(offset: number): Position {
    return this.doc.positionAt(this.toVirtualOffset(offset));
  }

  toPosition(virtualPosition: Position) {
    return toPosition(this.file.text, this.fromVirtualOffset(this.doc.offsetAt(virtualPosition)));
  }

  toRange(virtualRange: Range): Range {
    return { start: this.toPosition(virtualRange.start), end: this.toPosition(virtualRange.end) };
  }

  /** 虚拟文档中的偏移范围对应的源文件范围 */
  toRangeFromOffsets(virtualStart: number, virtualEnd: number): Range {
    const { text } = this.file;
    return {
      start: toPosition(text, this.fromVirtualOffset(virtualStart)),
      end: toPosition(text, this.fromVirtualOffset(virtualEnd)),
    };
  }
}

function createTemplate(file: SourceFile, node: Node) {
  if (!isTemplateLiteralNode(node)) return;
  const info = getTemplateInfo(node);
  return info && new Template(file, node, info);
}

export function findTemplates(file: SourceFile, kind: TemplateKind, root: Node = file) {
  const templates: Template[] = [];
  const first = createTemplate(file, root);
  if (first?.kind === kind) templates.push(first);
  root.forEachChild(function visit(node): undefined {
    const template = createTemplate(file, node);
    if (template?.kind === kind) templates.push(template);
    node.forEachChild(visit);
  });
  return templates;
}

export function findTemplate(file: SourceFile, offset: number) {
  const node = findAncestor(getTokenAtPosition(file, offset), isTemplateLiteralNode);
  const template = node && createTemplate(file, node);
  return template?.contains(offset) ? template : undefined;
}

/** HTML 模板中 `<style>` 的内容 */
export class EmbeddedDocument implements VirtualDocument {
  readonly doc: TextDocument;
  readonly fileName: string;
  readonly #template: Template;
  /** 内容在模板虚拟文档中的起始偏移 */
  readonly #start: number;

  constructor(template: Template, start: number, end: number, languageId: string) {
    this.#template = template;
    this.#start = start;
    this.fileName = template.fileName;
    const text = template.doc.getText().slice(start, end);
    this.doc = TextDocument.create(`${template.doc.uri}.${start}.${languageId}`, languageId, 0, text);
  }

  toVirtualPosition(offset: number): Position {
    return this.doc.positionAt(this.#template.toVirtualOffset(offset) - this.#start);
  }

  toRange(virtualRange: Range): Range {
    const toOffset = (position: Position) => this.doc.offsetAt(position) + this.#start;
    return this.#template.toRangeFromOffsets(toOffset(virtualRange.start), toOffset(virtualRange.end));
  }
}
