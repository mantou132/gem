import type {
  CompletionList,
  CompletionItem,
  TextDocument,
  Position,
  CancellationToken,
  CompletionItemProvider,
} from 'vscode';
import { getCSSLanguageService as getCSSLanguageService } from 'vscode-css-languageservice';

import { matchOffset, createVirtualDocument, translateCompletionList, removeSlot } from '../util';
import { STYLE_REG } from '../constants';

import { CompletionsCache } from './cache';

export class StyleCompletionItemProvider implements CompletionItemProvider {
  #cssLanguageService = getCSSLanguageService();
  #cache = new CompletionsCache();

  provideCompletionItems(document: TextDocument, position: Position, _token: CancellationToken): CompletionList {
    const cached = this.#cache.getCached(document, position);
    if (cached) return cached;

    const currentLine = document.lineAt(position.line);
    const empty: CompletionList = { isIncomplete: false, items: [] };

    if (currentLine.isEmptyOrWhitespace) return empty;

    const currentOffset = document.offsetAt(position);
    const documentText = document.getText();
    const match = matchOffset(STYLE_REG, documentText, currentOffset);

    if (!match) return empty;

    const matchContent = match.groups!.content;
    const matchStartOffset = match.index + match.groups!.start.length;
    const virtualOffset = currentOffset - matchStartOffset + 8; // accounting for :host { }
    const virtualDocument = createVirtualDocument('css', `:host { ${removeSlot(matchContent)} }`);
    const vCss = this.#cssLanguageService.parseStylesheet(virtualDocument);

    const completions = this.#cssLanguageService.doComplete(
      virtualDocument,
      virtualDocument.positionAt(virtualOffset),
      vCss,
    );

    return this.#cache.updateCached(document, position, translateCompletionList(completions, currentLine));
  }

  resolveCompletionItem(item: CompletionItem, _token: CancellationToken) {
    return item;
  }
}
