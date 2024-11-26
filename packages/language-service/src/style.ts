import { getCSSLanguageService as getCSSLanguageService } from 'vscode-css-languageservice';
import type { Position, TextDocument } from 'vscode-languageserver-textdocument';

import { matchOffset, createVirtualDocument, removeSlot, translateCompletionList } from './util';
import { STYLE_REG } from './constants';
import { CompletionsCache } from './cache';

export class StyleCompletionItemProvider {
  #cssLanguageService = getCSSLanguageService();
  #cache = new CompletionsCache();

  provideCompletionItems(document: TextDocument, position: Position) {
    const cached = this.#cache.getCached(document, position);
    if (cached) return cached;

    const currentOffset = document.offsetAt(position);
    const documentText = document.getText();
    const match = matchOffset(STYLE_REG, documentText, currentOffset);

    if (!match) return;

    const matchContent = match.groups!.content;
    const content = `.parent { ${removeSlot(matchContent)} }`;
    const matchStartOffset = match.index + match.groups!.start.length;
    const virtualOffset = currentOffset - matchStartOffset + 9;
    const virtualDocument = createVirtualDocument('css', content);
    const vCss = this.#cssLanguageService.parseStylesheet(virtualDocument);

    const completions = this.#cssLanguageService.doComplete(
      virtualDocument,
      virtualDocument.positionAt(virtualOffset),
      vCss,
    );

    return this.#cache.updateCached(document, position, translateCompletionList(completions, position));
  }
}
