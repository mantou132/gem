import type {
  CompletionList,
  CompletionItem,
  TextDocument,
  Position,
  CancellationToken,
  CompletionItemProvider,
} from 'vscode';
import type { LanguageService as HTMLanguageService } from 'vscode-html-languageservice';
import type { LanguageService as CSSLanguageService } from 'vscode-css-languageservice';
import { getLanguageService as getHTMLanguageService } from 'vscode-html-languageservice';
import { getCSSLanguageService as getCSSLanguageService } from 'vscode-css-languageservice';

import {
  matchOffset,
  createVirtualDocument,
  getLanguageRegions,
  getRegionAtOffset,
  translateCompletionList,
  translateToCSS,
} from '../util';
import { CompletionsCache } from '../cache';

export class HTMLStyleCompletionItemProvider implements CompletionItemProvider {
  #cssLanguageService: CSSLanguageService = getCSSLanguageService();
  #htmlLanguageService: HTMLanguageService = getHTMLanguageService();
  #expression = /(\/\*\s*html\s*\*\/\s*`|(?<!`)html\s*`)([^`]*)(`)/gi;
  #cache = new CompletionsCache();

  provideCompletionItems(document: TextDocument, position: Position, _token: CancellationToken) {
    const cached = this.#cache.getCached(document, position);
    if (cached) return cached;

    const currentLine = document.lineAt(position.line);
    const empty: CompletionList = { isIncomplete: false, items: [] };

    if (currentLine.isEmptyOrWhitespace) return empty;

    const currentOffset = document.offsetAt(position);
    const documentText = document.getText();
    const match = matchOffset(this.#expression, documentText, currentOffset);

    if (!match) return empty;

    const matchContent = match[2];
    const matchStartOffset = match.index + match[1].length;
    const regions = getLanguageRegions(this.#htmlLanguageService, matchContent);

    if (regions.length <= 0) return empty;

    const region = getRegionAtOffset(regions, currentOffset - matchStartOffset);

    if (!region) return empty;

    const virtualOffset = currentOffset - (matchStartOffset + region.start);
    const virtualDocument = createVirtualDocument('css', translateToCSS(region.content));
    const stylesheet = this.#cssLanguageService.parseStylesheet(virtualDocument);

    const completions = this.#cssLanguageService.doComplete(
      virtualDocument,
      virtualDocument.positionAt(virtualOffset),
      stylesheet,
    );

    return this.#cache.updateCached(document, position, translateCompletionList(completions, currentLine));
  }

  resolveCompletionItem(item: CompletionItem, _token: CancellationToken) {
    return item;
  }
}

export class CSSCompletionItemProvider implements CompletionItemProvider {
  #cssLanguageService: CSSLanguageService = getCSSLanguageService();
  #expression = /(\/\*\s*(css|less|scss)\s*\*\/\s*`|(?<!`)(?:css|less|scss|createCSSSheet|stylesheet)\s*`)([^`]*)(`)/gi;
  #cache = new CompletionsCache();

  provideCompletionItems(document: TextDocument, position: Position, _token: CancellationToken) {
    const cached = this.#cache.getCached(document, position);
    if (cached) return cached;

    const currentLine = document.lineAt(position.line);
    const empty: CompletionList = { isIncomplete: false, items: [] };

    if (currentLine.isEmptyOrWhitespace) return empty;

    const currentOffset = document.offsetAt(position);
    const documentText = document.getText();
    const match = matchOffset(this.#expression, documentText, currentOffset);

    if (!match) return empty;

    const dialect = match[2];
    const matchContent = match[3];
    const matchStartOffset = match.index + match[1].length;
    const virtualOffset = currentOffset - matchStartOffset;
    const virtualDocument = createVirtualDocument(dialect, translateToCSS(matchContent));
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
