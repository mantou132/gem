import type * as ts from 'typescript/lib/tsserverlibrary';
import type { TemplateLanguageService, TemplateContext } from 'typescript-template-language-service-decorator';
import type { CompletionList, HTMLDocument, Position, Range } from 'vscode-html-languageservice';
import { getLanguageService as getHTMLanguageService } from 'vscode-html-languageservice';
import { doComplete as doEmmetComplete } from '@vscode/emmet-helper';
import { getCSSLanguageService } from 'vscode-css-languageservice';

import type { Context } from './decorate-ts';
import {
  createVirtualDocument,
  genDefaultCompletionEntryDetails,
  translateCompletionItemsToCompletionEntryDetails,
  translateCompletionItemsToCompletionInfo,
  translateHover,
} from './utils';
import { LRUCache } from './cache';

export class HTMLLanguageService implements TemplateLanguageService {
  #completionsCache = new LRUCache<CompletionList>();
  #diagnosticsCache = new LRUCache<ts.Diagnostic[]>();
  #htmlLanguageService = getHTMLanguageService();
  #cssLanguageService = getCSSLanguageService();
  #ctx: Context;

  constructor(ctx: Context) {
    this.#ctx = ctx;
  }

  #getAllCssDoc(doc: HTMLDocument) {
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

  #getCssDoc(context: TemplateContext, position: ts.LineAndCharacter, doc: HTMLDocument) {
    const node = doc.findNodeAt(context.toOffset(position));
    if (node.tag !== 'style') return;
    const virtualDocument = createVirtualDocument('css', context.text.slice(node.startTagEnd, node.endTagStart));
    const style = this.#cssLanguageService.parseStylesheet(virtualDocument);
    const offset = context.toOffset(position) - node.startTagEnd!;
    const toPosition = (pos: Position) => context.toPosition(virtualDocument.offsetAt(pos) + node.startTagEnd!);
    return {
      style,
      virtualDocument,
      position: virtualDocument.positionAt(offset),
      updateRange: (range: Range) => ({
        start: toPosition(range.start),
        end: toPosition(range.end),
      }),
    };
  }

  #getCSSCompletionsAtPosition(context: TemplateContext, position: ts.LineAndCharacter, doc: HTMLDocument) {
    const css = this.#getCssDoc(context, position, doc);
    if (!css) return [];
    let emmetResults: CompletionList | undefined;
    this.#cssLanguageService.setCompletionParticipants([
      {
        onCssProperty: () => {
          emmetResults = doEmmetComplete(css.virtualDocument, css.position, 'css', this.#ctx.config.emmet);
        },
      },
    ]);
    const completions = this.#cssLanguageService.doComplete(css.virtualDocument, css.position, css.style);
    completions.items.push(...(emmetResults?.items || []));
    return completions.items.map((e) => ({
      ...e,
      textEdit:
        e.textEdit && 'range' in e.textEdit
          ? {
              newText: e.textEdit.newText,
              range: css.updateRange(e.textEdit.range),
            }
          : e.textEdit,
    }));
  }

  #getCompletionsAtPosition(context: TemplateContext, position: ts.LineAndCharacter) {
    const cached = this.#completionsCache.getCached(context, position);
    if (cached) return cached;
    const virtualDocument = createVirtualDocument('html', context.text);
    const vHtml = this.#htmlLanguageService.parseHTMLDocument(virtualDocument);

    let emmetResults: CompletionList | undefined;
    this.#htmlLanguageService.setCompletionParticipants([
      {
        onHtmlContent: () => {
          emmetResults = doEmmetComplete(virtualDocument, position, 'html', this.#ctx.config.emmet);
        },
      },
    ]);

    const completions = this.#htmlLanguageService.doComplete(virtualDocument, position, vHtml);

    completions.items.push(...(emmetResults?.items || []));
    completions.items.push(...this.#getCSSCompletionsAtPosition(context, position, vHtml));

    return this.#completionsCache.updateCached(context, position, completions);
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
    const css = this.#getCssDoc(context, position, doc);
    const hover =
      css &&
      this.#cssLanguageService.doHover(css.virtualDocument, css.position, css.style, {
        documentation: true,
        references: true,
      });
    return (
      hover && {
        ...hover,
        range: hover.range && css.updateRange(hover.range),
      }
    );
  }

  getQuickInfoAtPosition(context: TemplateContext, position: ts.LineAndCharacter) {
    const virtualDocument = createVirtualDocument('html', context.text);
    const vHtml = this.#htmlLanguageService.parseHTMLDocument(virtualDocument);
    const hover =
      this.#htmlLanguageService.doHover(virtualDocument, position, vHtml, {
        documentation: true,
        references: true,
      }) || this.#getCSSQuickInfoAtPosition(context, position, vHtml);
    if (!hover) return;
    return translateHover(context, hover, position);
  }

  getSyntacticDiagnostics(context: TemplateContext): ts.Diagnostic[] {
    const cached = this.#diagnosticsCache.getCached(context);
    if (cached) return cached;
    const virtualDocument = createVirtualDocument('html', context.text);
    const vHtml = this.#htmlLanguageService.parseHTMLDocument(virtualDocument);
    const styles = this.#getAllCssDoc(vHtml);
    const file = this.#ctx.getProgram()!.getSourceFile(context.fileName);
    return this.#diagnosticsCache.updateCached(
      context,
      styles
        .map((node) => {
          const textDocument = createVirtualDocument('css', context.text.slice(node.startTagEnd, node.endTagStart));
          const vCss = this.#cssLanguageService.parseStylesheet(textDocument);
          const oDiagnostics = this.#cssLanguageService.doValidation(textDocument, vCss);
          return oDiagnostics.map(({ message, range }) => {
            const start = node.startTagEnd! + textDocument.offsetAt(range.start);
            const end = node.startTagEnd! + textDocument.offsetAt(range.end);
            return {
              category: context.typescript.DiagnosticCategory.Warning,
              code: 0,
              file,
              start,
              length: end - start,
              messageText: message,
            };
          });
        })
        .flat(),
    );
  }
}
