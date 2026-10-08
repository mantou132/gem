import { TextDocument } from '@mantou/vscode-html-languageservice';
import type { Node, SourceFile, TaggedTemplateExpression } from 'typescript/unstable/ast';
import {
  getTokenAtPosition,
  isIdentifier,
  isNoSubstitutionTemplateLiteral,
  isTaggedTemplateExpression,
} from 'typescript/unstable/ast';
import type { Position, Range } from 'typescript/unstable/vscode';

const TEMPLATE_TAGS = {
  html: new Set(['html', 'raw', 'h']),
  css: new Set(['css', 'styled']),
};

const SUBSTITUTION_CHAR = '_';

export type TemplateKind = keyof typeof TEMPLATE_TAGS;

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

function getTemplateKind(node: TaggedTemplateExpression) {
  if (!isIdentifier(node.tag)) return;
  const name = node.tag.text;
  return (Object.keys(TEMPLATE_TAGS) as TemplateKind[]).find((kind) => TEMPLATE_TAGS[kind].has(name));
}

/**
 * 模板字符串对应的虚拟文档，插值替换成等长的占位字符，保持偏移一致
 */
export class Template {
  readonly kind: TemplateKind;
  readonly node: TaggedTemplateExpression;
  readonly fileName: string;
  /** 模板内容在源文件中的起始偏移（反引号之后） */
  readonly start: number;
  readonly doc: TextDocument;
  #file: SourceFile;

  constructor(file: SourceFile, node: TaggedTemplateExpression, kind: TemplateKind) {
    const { template } = node;
    this.#file = file;
    this.fileName = file.fileName;
    this.kind = kind;
    this.node = node;
    this.start = template.getStart(file) + 1;
    const chars = file.text.slice(this.start, template.end - 1).split('');
    if (!isNoSubstitutionTemplateLiteral(template)) {
      let substitutionStart = template.head.end - 2;
      for (const span of template.templateSpans) {
        const substitutionEnd = span.literal.getStart(file) + 1;
        for (let i = substitutionStart; i < substitutionEnd; i++) {
          if (chars[i - this.start] !== '\n') chars[i - this.start] = SUBSTITUTION_CHAR;
        }
        substitutionStart = span.literal.end - 2;
      }
    }
    this.doc = TextDocument.create(`gem-template://${this.start}.${kind}`, kind, 0, chars.join(''));
  }

  contains(offset: number) {
    return offset >= this.start && offset <= this.start + this.doc.getText().length;
  }

  toVirtualPosition(offset: number): Position {
    return this.doc.positionAt(offset - this.start);
  }

  toPosition(virtualPosition: Position) {
    return toPosition(this.#file.text, this.doc.offsetAt(virtualPosition) + this.start);
  }

  toRange(virtualRange: Range): Range {
    return { start: this.toPosition(virtualRange.start), end: this.toPosition(virtualRange.end) };
  }

  /** 虚拟文档中的偏移范围对应的源文件范围 */
  toRangeFromOffsets(virtualStart: number, virtualEnd: number): Range {
    const text = this.#file.text;
    return { start: toPosition(text, virtualStart + this.start), end: toPosition(text, virtualEnd + this.start) };
  }

  /** 模板标签名，例如 `html` `raw` */
  get tagName() {
    return isIdentifier(this.node.tag) ? this.node.tag.text : '';
  }
}

export function findTemplates(file: SourceFile, kind: TemplateKind) {
  const templates: Template[] = [];
  file.forEachChild(function visit(node): undefined {
    if (isTaggedTemplateExpression(node) && getTemplateKind(node) === kind) {
      templates.push(new Template(file, node, kind));
    }
    node.forEachChild(visit);
  });
  return templates;
}

export function findTemplate(file: SourceFile, offset: number) {
  const node = findAncestor(getTokenAtPosition(file, offset), isTaggedTemplateExpression);
  const kind = node && getTemplateKind(node);
  if (!node || !kind) return;
  const template = new Template(file, node, kind);
  return template.contains(offset) ? template : undefined;
}
