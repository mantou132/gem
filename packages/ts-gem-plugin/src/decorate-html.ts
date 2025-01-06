import type * as ts from 'typescript/lib/tsserverlibrary';
import type { TemplateLanguageService, TemplateContext } from 'typescript-template-language-service-decorator';
import type { CompletionList as HTMLCompletionList, HTMLDocument, Position, Range } from 'vscode-html-languageservice';
import { getLanguageService as getHTMLanguageService } from 'vscode-html-languageservice';
import { doComplete as doEmmetComplete } from '@vscode/emmet-helper';
import { getCSSLanguageService } from 'vscode-css-languageservice';

import type { Context } from './decorate-ts';
import { createVirtualDocument, translateCompletionItemsToCompletionInfo, translateHover } from './utils';

export class HTMLLanguageService implements TemplateLanguageService {
  #htmlLanguageService = getHTMLanguageService();
  #cssLanguageService = getCSSLanguageService();
  #ctx: Context;

  constructor(ctx: Context) {
    this.#ctx = ctx;
  }

  #getCssDoc(context: TemplateContext, position: ts.LineAndCharacter, doc: HTMLDocument) {
    const node = doc.findNodeAt(context.toOffset(position));
    if (node.tag !== 'style') return;
    const virtualDocument = createVirtualDocument('css', context.text.slice(node.start, node.end));
    const style = this.#cssLanguageService.parseStylesheet(virtualDocument);
    const offset = context.toOffset(position) - node.start;
    const toPosition = (pos: Position) => context.toPosition(virtualDocument.offsetAt(pos) + node.start);
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
    const completions = this.#cssLanguageService.doComplete(css.virtualDocument, css.position, css.style);
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

  getCompletionsAtPosition(context: TemplateContext, position: ts.LineAndCharacter) {
    const virtualDocument = createVirtualDocument('html', context.text);
    const vHtml = this.#htmlLanguageService.parseHTMLDocument(virtualDocument);

    let emmetResults: HTMLCompletionList = { isIncomplete: true, items: [] };
    this.#htmlLanguageService.setCompletionParticipants([
      {
        onHtmlContent: async () => {
          const result = doEmmetComplete(virtualDocument, position, 'html', this.#ctx.config.emmet);
          if (result) {
            emmetResults = {
              ...result,
              items: result.items.map((item) => ({
                ...item,
                command: {
                  title: 'Emmet Expand Abbreviation',
                  command: 'editor.emmet.action.expandAbbreviation',
                },
              })),
            };
          }
        },
      },
    ]);

    const completions = this.#htmlLanguageService.doComplete(virtualDocument, position, vHtml);

    if (emmetResults.items.length) {
      completions.items.push(...emmetResults.items);
    }

    if (!completions.items.length) {
      completions.items.push(...this.#getCSSCompletionsAtPosition(context, position, vHtml));
    }

    return translateCompletionItemsToCompletionInfo(context, completions);
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

  // 没有诊断 html 里面的内联样式
}
