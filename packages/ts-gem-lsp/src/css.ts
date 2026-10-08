import type { CompletionList, Hover, Node } from '@mantou/vscode-css-languageservice';
import { getCSSLanguageService, NodeType, updateTags } from '@mantou/vscode-css-languageservice';
import { doComplete as doEmmetComplete } from '@mantou/vscode-emmet-helper';
import type { Diagnostic, FoldingRange, Range } from 'typescript/unstable/vscode';

import type { GemConfiguration } from './configuration';
import type { VirtualDocument } from './template';
import { translateCompletionList, translateFoldingRange, translateHover } from './translate';

const SOURCE = 'gem';

export class CssService {
  #ls = getCSSLanguageService();

  parse(vDoc: VirtualDocument) {
    return this.#ls.parseStylesheet(vDoc.doc);
  }
  #getConfig: () => GemConfiguration;

  constructor(getConfig: () => GemConfiguration) {
    this.#getConfig = getConfig;
  }

  /** 标签选择器补全自定义元素 */
  complete(vDoc: VirtualDocument, offset: number, tags: string[]): CompletionList {
    updateTags(tags);
    const position = vDoc.toVirtualPosition(offset);
    const stylesheet = this.#ls.parseStylesheet(vDoc.doc);
    let emmet: CompletionList | undefined;
    const onCssProperty = () => (emmet = doEmmetComplete(vDoc.doc, position, 'css', this.#getConfig().emmet));
    this.#ls.setCompletionParticipants([{ onCssProperty }]);
    const list = this.#ls.doComplete(vDoc.doc, position, stylesheet);
    return translateCompletionList(vDoc, offset, { ...list, items: [...list.items, ...(emmet?.items ?? [])] });
  }

  hover(vDoc: VirtualDocument, offset: number): Hover | null {
    const stylesheet = this.#ls.parseStylesheet(vDoc.doc);
    const hover = this.#ls.doHover(vDoc.doc, vDoc.toVirtualPosition(offset), stylesheet, {
      documentation: true,
      references: true,
    });
    return translateHover(vDoc, hover);
  }

  diagnostics(vDoc: VirtualDocument): Diagnostic[] {
    const stylesheet = this.#ls.parseStylesheet(vDoc.doc);
    const strictDiagnostics = this.#getConfig().strict ? this.#checkScopeDisplay(vDoc, stylesheet as Node) : [];
    return [...strictDiagnostics, ...this.#validate(vDoc, stylesheet)];
  }

  /** 宿主选择器上设置 `display` 会使 `hidden` 属性失效 */
  #checkScopeDisplay(vDoc: VirtualDocument, stylesheet: Node): Diagnostic[] {
    const scopeSelectors = new Set([':host', ':scope', '&']);
    return stylesheet.getChildren().flatMap((rule) => {
      if (rule.type !== NodeType.Ruleset) return [];
      const [selectors, declarations] = rule.getChildren();
      const selectorText = selectors?.getText() ?? '';
      if (!selectors?.getChildren().every((s) => scopeSelectors.has(s.getText()))) return [];
      return (declarations?.getChildren() ?? []).flatMap((decl) => {
        const [property] = decl.getChildren();
        if (property?.getText() !== 'display') return [];
        const range = { start: vDoc.doc.positionAt(property.offset), end: vDoc.doc.positionAt(property.end) };
        return [
          {
            range: vDoc.toRange(range),
            severity: 2,
            source: SOURCE,
            message: `Do not set 'display' directly in '${selectorText}', which will cause the 'hidden' attribute to be unavailable`,
          } satisfies Diagnostic,
        ];
      });
    });
  }

  #validate(vDoc: VirtualDocument, stylesheet: ReturnType<typeof this.parse>): Diagnostic[] {
    return this.#ls.doValidation(vDoc.doc, stylesheet).map(({ message, range, code }) => ({
      range: vDoc.toRange(range),
      severity: 2,
      code: typeof code === 'string' || typeof code === 'number' ? code : undefined,
      source: SOURCE,
      message,
    }));
  }

  /** 类选择器和 id 选择器，类名不带 `.`，id 带 `#`，位置是虚拟文档中的偏移 */
  classIdSelectors(vDoc: VirtualDocument) {
    const result: { name: string; start: number; end: number }[] = [];
    const visit = (node: Node) => {
      if (node.type === NodeType.IdentifierSelector || node.parent?.type === NodeType.ClassSelector) {
        result.push({ name: node.getText(), start: node.offset, end: node.end });
      }
      node.getChildren().forEach(visit);
    };
    visit(this.#ls.parseStylesheet(vDoc.doc) as Node);
    return result;
  }

  /** 光标处的类选择器或 id 选择器 */
  selectorAt(vDoc: VirtualDocument, offset: number) {
    const vOffset = vDoc.doc.offsetAt(vDoc.toVirtualPosition(offset));
    return this.classIdSelectors(vDoc).find(({ start, end }) => vOffset >= start && vOffset <= end);
  }

  /** 元素选择器，位置是源文件中的范围 */
  elementSelectors(vDoc: VirtualDocument, tag: string): Range[] {
    const ranges: Range[] = [];
    const visit = (node: Node) => {
      if (node.type === NodeType.ElementNameSelector && node.getText() === tag) {
        ranges.push(vDoc.toRange({ start: vDoc.doc.positionAt(node.offset), end: vDoc.doc.positionAt(node.end) }));
      }
      node.getChildren().forEach(visit);
    };
    visit(this.parse(vDoc) as Node);
    return ranges;
  }

  #nodeAt(vDoc: VirtualDocument, offset: number) {
    const vOffset = vDoc.doc.offsetAt(vDoc.toVirtualPosition(offset));
    return (this.parse(vDoc) as Node).findChildAtOffset(vOffset, true) ?? undefined;
  }

  #toRange(vDoc: VirtualDocument, node: Node): Range {
    return vDoc.toRange({ start: vDoc.doc.positionAt(node.offset), end: vDoc.doc.positionAt(node.end) });
  }

  /** 光标处的元素选择器 */
  elementSelectorAt(vDoc: VirtualDocument, offset: number) {
    const node = this.#nodeAt(vDoc, offset);
    const selector = node?.type === NodeType.ElementNameSelector ? node : node?.parent;
    if (selector?.type !== NodeType.ElementNameSelector) return;
    return { tag: selector.getText(), range: this.#toRange(vDoc, selector) };
  }

  /** 光标处的自定义属性，例如 `--color` */
  customPropertyAt(vDoc: VirtualDocument, offset: number) {
    const node = this.#nodeAt(vDoc, offset);
    if (node?.type !== NodeType.Identifier || !node.getText().startsWith('--')) return;
    return { name: node.getText(), range: this.#toRange(vDoc, node) };
  }

  /** 文档中自定义属性的声明和使用 */
  customPropertyLocations(vDoc: VirtualDocument, name: string) {
    const declarations: Range[] = [];
    const references: Range[] = [];
    const visit = (node: Node) => {
      if (node.type === NodeType.Identifier && node.getText() === name) {
        const isDeclaration = node.findAParent(NodeType.CustomPropertyDeclaration)?.getChild(0) === node.parent;
        (isDeclaration ? declarations : references).push(this.#toRange(vDoc, node));
      }
      node.getChildren().forEach(visit);
    };
    visit(this.parse(vDoc) as Node);
    return { declarations, references };
  }

  foldingRanges(vDoc: VirtualDocument): FoldingRange[] {
    return this.#ls.getFoldingRanges(vDoc.doc).map((range) => translateFoldingRange(vDoc, range));
  }
}
