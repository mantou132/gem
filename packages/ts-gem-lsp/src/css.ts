import type { CompletionList, Hover, Node } from '@mantou/vscode-css-languageservice';
import { getCSSLanguageService, NodeType, updateTags } from '@mantou/vscode-css-languageservice';
import type { Diagnostic } from 'typescript/unstable/vscode';

import type { VirtualDocument } from './template';
import { translateCompletionList, translateHover } from './translate';

const SOURCE = 'gem';

export class CssService {
  #ls = getCSSLanguageService();

  /** 标签选择器补全自定义元素 */
  complete(vDoc: VirtualDocument, offset: number, tags: string[]): CompletionList {
    updateTags(tags);
    const stylesheet = this.#ls.parseStylesheet(vDoc.doc);
    const list = this.#ls.doComplete(vDoc.doc, vDoc.toVirtualPosition(offset), stylesheet);
    return translateCompletionList(vDoc, offset, list);
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
}
