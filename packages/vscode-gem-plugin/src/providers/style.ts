import type {
  CompletionList,
  CompletionItem,
  TextDocument,
  Position,
  CancellationToken,
  CompletionItemProvider,
} from 'vscode';
import type { LanguageService as CSSLanguageService } from 'vscode-css-languageservice';
import { getCSSLanguageService as getCSSLanguageService } from 'vscode-css-languageservice';

import { matchOffset, createVirtualDocument, translateCompletionList, translateToCSS } from '../util';
import { CompletionsCache } from '../cache';

export class StyleCompletionItemProvider implements CompletionItemProvider {
  #cssLanguageService: CSSLanguageService = getCSSLanguageService();
  #expression = /(\/\*\s*(style)\s*\*\/\s*`|(?<!`)styled?\s*`)([^`]*)(`)/gi;
  #cache = new CompletionsCache();

  provideCompletionItems(document: TextDocument, position: Position, _token: CancellationToken): CompletionList {
    const cached = this.#cache.getCached(document, position);
    if (cached) return cached;

    const currentLine = document.lineAt(position.line);
    const empty: CompletionList = { isIncomplete: false, items: [] };

    if (currentLine.isEmptyOrWhitespace) return empty;

    const currentOffset = document.offsetAt(position);
    const documentText = document.getText();
    const match = matchOffset(this.#expression, documentText, currentOffset);

    if (!match) return empty;

    const matchContent = match[3];
    const matchStartOffset = match.index + match[1].length;
    const virtualOffset = currentOffset - matchStartOffset + 8; // accounting for :host { }
    const virtualDocument = createVirtualDocument('css', `:host { ${translateToCSS(matchContent)} }`);
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
