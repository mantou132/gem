import { kebabToCamelCase } from '@mantou/gem/lib/utils';
import type { TemplateContext, TemplateLanguageService } from '@mantou/typescript-template-language-service-decorator';
import { updateTags as updateCSSTags } from '@mantou/vscode-css-languageservice';
import { doComplete as doEmmetComplete, updateTags } from '@mantou/vscode-emmet-helper';
import type { CompletionList, HTMLDocument, Position, Range } from '@mantou/vscode-html-languageservice';
import type * as ts from 'typescript/lib/tsserverlibrary';

import { LRUCache } from './cache';
import type { Context } from './context';
import { forEachNode, getAttrName, getHTMLTextAtPosition, isCustomElementTag } from './utils';
import {
  genAttrDefinitionInfo,
  genDefaultCompletionEntryDetails,
  genElementDefinitionInfo,
  translateCompletionItemsToCompletionEntryDetails,
  translateCompletionItemsToCompletionInfo,
  translateHover,
} from './translates';

export class HTMLLanguageService implements TemplateLanguageService {
  #completionsCache = new LRUCache<CompletionList>({ max: 1 });
  #diagnosticsCache = new LRUCache<ts.Diagnostic[]>();
  #ctx: Context;

  constructor(ctx: Context) {
    this.#ctx = ctx;
  }

  #getAllStyleSheet(doc: HTMLDocument) {
    const styles: typeof doc.roots = [];
    const nodes = [...doc.roots];
    while (true) {
      const node = nodes.pop();
      if (!node) break;
      if (node.tag === 'style') styles.push(node);
      nodes.push(...node.children);
    }
    return styles;
  }

  #getEmbeddedCss(context: TemplateContext, position: ts.LineAndCharacter, doc: HTMLDocument) {
    const node = doc.findNodeAt(context.toOffset(position));
    if (node.tag !== 'style') return;
    const text = context.text.slice(node.startTagEnd, node.endTagStart);
    const { vDoc, vCss } = this.#ctx.getCssDoc(text);
    const offset = context.toOffset(position) - node.startTagEnd!;
    const toPosition = (pos: Position) => context.toPosition(vDoc.offsetAt(pos) + node.startTagEnd!);
    return {
      style: vCss,
      vDoc,
      position: vDoc.positionAt(offset),
      updateRange: (range: Range) => ({
        start: toPosition(range.start),
        end: toPosition(range.end),
      }),
    };
  }

  #getCSSCompletionsAtPosition(context: TemplateContext, position: ts.LineAndCharacter, doc: HTMLDocument) {
    const css = this.#getEmbeddedCss(context, position, doc);
    if (!css) return [];

    let emmetResults: CompletionList | undefined;
    const onCssProperty = () => (emmetResults = doEmmetComplete(css.vDoc, css.position, 'css', this.#ctx.config.emmet));
    this.#ctx.cssLanguageService.setCompletionParticipants([{ onCssProperty }]);
    updateCSSTags([...this.#ctx.elements].map(([tag]) => tag));
    const completions = this.#ctx.cssLanguageService.doComplete(css.vDoc, css.position, css.style);

    completions.items.push(...(emmetResults?.items || []));
    return completions.items.map((e) => {
      const textEdit = e.textEdit && 'range' in e.textEdit && e.textEdit;
      const newTextEdit = textEdit && { newText: textEdit.newText, range: css.updateRange(textEdit.range) };
      return { ...e, textEdit: newTextEdit || e.textEdit };
    });
  }

  #getCompletionsAtPosition(context: TemplateContext, position: ts.LineAndCharacter) {
    return this.#completionsCache.get(context, position, () => {
      const { vDoc, vHtml } = this.#ctx.getHtmlDoc(context.text);

      let emmetResults: CompletionList | undefined;
      const onHtmlContent = () => {
        updateTags([...this.#ctx.elements].map(([tag]) => tag));
        emmetResults = doEmmetComplete(vDoc, position, 'html', this.#ctx.config.emmet);
      };
      this.#ctx.htmlLanguageService.setCompletionParticipants([{ onHtmlContent }]);
      const completions = this.#ctx.htmlLanguageService.doComplete(vDoc, position, vHtml);

      completions.items.push(...(emmetResults?.items || []));
      completions.items.push(...this.#getCSSCompletionsAtPosition(context, position, vHtml));

      return completions;
    });
  }

  getCompletionsAtPosition(context: TemplateContext, position: ts.LineAndCharacter) {
    return translateCompletionItemsToCompletionInfo(context, this.#getCompletionsAtPosition(context, position));
  }

  getCompletionEntryDetails(
    context: TemplateContext,
    position: ts.LineAndCharacter,
    name: string,
  ): ts.CompletionEntryDetails {
    const completions = this.#getCompletionsAtPosition(context, position);
    const item = completions.items.find((e) => e.label === name);
    if (!item) return genDefaultCompletionEntryDetails(context, name);

    return translateCompletionItemsToCompletionEntryDetails(context, item);
  }

  #getCSSQuickInfoAtPosition(context: TemplateContext, position: ts.LineAndCharacter, doc: HTMLDocument) {
    const css = this.#getEmbeddedCss(context, position, doc);
    if (!css) return;
    const hover = this.#ctx.cssLanguageService.doHover(css.vDoc, css.position, css.style, {
      documentation: true,
      references: true,
    });
    if (!hover) return;
    return { ...hover, range: hover.range && css.updateRange(hover.range) };
  }

  getQuickInfoAtPosition(context: TemplateContext, position: ts.LineAndCharacter) {
    const { vDoc, vHtml } = this.#ctx.getHtmlDoc(context.text);
    const htmlHover = this.#ctx.htmlLanguageService.doHover(vDoc, position, vHtml, {
      documentation: true,
      references: true,
    });
    const hover = htmlHover || this.#getCSSQuickInfoAtPosition(context, position, vHtml);
    if (!hover) return;
    return translateHover(context, hover, position);
  }

  #getCssSyntacticDiagnostics(context: TemplateContext) {
    return this.#diagnosticsCache.get(context, undefined, () => {
      const { vHtml } = this.#ctx.getHtmlDoc(context.text);
      const file = this.#ctx.getProgram().getSourceFile(context.fileName);
      const styles = this.#getAllStyleSheet(vHtml);
      const diagnostics: ts.Diagnostic[] = [];
      styles.forEach((node) => {
        const text = context.text.slice(node.startTagEnd, node.endTagStart);
        const { vDoc, vCss } = this.#ctx.getCssDoc(text);
        this.#ctx.cssLanguageService.doValidation(vDoc, vCss).forEach(({ message, range }) => {
          const start = node.startTagEnd! + vDoc.offsetAt(range.start);
          const end = node.startTagEnd! + vDoc.offsetAt(range.end);
          diagnostics.push({
            category: context.typescript.DiagnosticCategory.Warning,
            code: 0,
            file,
            start,
            length: end - start,
            messageText: message,
          });
        });
      });
      return diagnostics;
    });
  }

  #getHtmlSyntacticDiagnostics(context: TemplateContext) {
    const { vHtml } = this.#ctx.getHtmlDoc(context.text);
    const file = this.#ctx.getProgram().getSourceFile(context.fileName);
    const diagnostics: ts.Diagnostic[] = [];
    forEachNode(vHtml.roots, (node) => {
      if (node.tag && isCustomElementTag(node.tag) && !this.#ctx.elements.get(node.tag)) {
        diagnostics.push({
          category: context.typescript.DiagnosticCategory.Warning,
          code: 0,
          file,
          start: node.start + 1,
          length: node.tag.length,
          messageText: 'Undefined element',
        });
      }
    });
    return diagnostics;
  }

  getSyntacticDiagnostics(context: TemplateContext): ts.Diagnostic[] {
    this.#ctx.initElements();
    return [...this.#getCssSyntacticDiagnostics(context), ...this.#getHtmlSyntacticDiagnostics(context)];
  }

  getDefinitionAndBoundSpan(context: TemplateContext, position: ts.LineAndCharacter): ts.DefinitionInfoAndBoundSpan {
    const currentOffset = context.toOffset(position);
    const { vHtml } = this.#ctx.getHtmlDoc(context.text);
    const node = vHtml.findNodeAt(currentOffset);
    const { text, start, length, before } = getHTMLTextAtPosition(context.text, currentOffset);
    const empty = { textSpan: { start, length } };

    if (node.tag === 'style') {
      const { style, vDoc, position: pos } = this.#getEmbeddedCss(context, position, vHtml)!;
      const cssNode = style.findChildAtOffset(vDoc.offsetAt(pos), true);
      if (!cssNode) return empty;
      const ident = vDoc.getText().slice(cssNode.offset, cssNode.end);
      const definitionNode = this.#ctx.elements.get(ident);
      if (!definitionNode) return empty;
      return genElementDefinitionInfo(
        context,
        { start: cssNode.offset + node.startTagEnd!, length: cssNode.length },
        definitionNode,
      );
    }

    const definitionNode = this.#ctx.elements.get(node.tag!);

    if (!definitionNode || currentOffset > node.startTagEnd! || !text) return empty;

    if (text === node.tag) {
      return genElementDefinitionInfo(context, { start, length }, definitionNode);
    }

    const { attr, offset } = getAttrName(text);
    if (before.length > attr.length) return empty;

    const typeChecker = this.#ctx.getProgram().getTypeChecker();
    const propSymbol = typeChecker.getTypeAtLocation(definitionNode).getProperty(kebabToCamelCase(attr));
    const propDeclaration = propSymbol?.getDeclarations()?.at(0);
    if (!propDeclaration) return empty;
    return genAttrDefinitionInfo(context, { start: start + offset, length: attr.length }, propDeclaration);
  }
}
