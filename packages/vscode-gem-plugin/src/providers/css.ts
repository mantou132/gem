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
import { getLanguageService as getHTMLanguageService, TokenType as HTMLTokenType } from 'vscode-html-languageservice';
import { getCSSLanguageService as getCSSLanguageService } from 'vscode-css-languageservice';

import { matchOffset, createVirtualDocument, translateCompletionList, removeSlot } from '../util';
import { CompletionsCache } from '../cache';
import { CSS_REG, HTML_REG } from '../constants';

export function getRegionAtOffset(regions: IEmbeddedRegion[], offset: number) {
  for (const region of regions) {
    if (region.start <= offset) {
      if (offset <= region.end) {
        return region;
      }
    } else {
      break;
    }
  }
  return null;
}

export interface IEmbeddedRegion {
  languageId: string;
  start: number;
  end: number;
  length: number;
  content: string;
}

export function getLanguageRegions(service: HTMLanguageService, data: string) {
  const scanner = service.createScanner(data);
  const regions: IEmbeddedRegion[] = [];
  let tokenType: HTMLTokenType;

  while ((tokenType = scanner.scan()) !== HTMLTokenType.EOS) {
    switch (tokenType) {
      case HTMLTokenType.Styles:
        regions.push({
          languageId: 'css',
          start: scanner.getTokenOffset(),
          end: scanner.getTokenEnd(),
          length: scanner.getTokenLength(),
          content: scanner.getTokenText(),
        });
        break;
      default:
        break;
    }
  }

  return regions;
}

export class HTMLStyleCompletionItemProvider implements CompletionItemProvider {
  #cssLanguageService: CSSLanguageService = getCSSLanguageService();
  #htmlLanguageService: HTMLanguageService = getHTMLanguageService();
  #expression = HTML_REG;
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

    const matchContent = match.groups!.content;
    const matchStartOffset = match.index + match.groups!.start.length;
    const regions = getLanguageRegions(this.#htmlLanguageService, matchContent);

    if (regions.length <= 0) return empty;

    const region = getRegionAtOffset(regions, currentOffset - matchStartOffset);

    if (!region) return empty;

    const virtualOffset = currentOffset - (matchStartOffset + region.start);
    const virtualDocument = createVirtualDocument('css', removeSlot(region.content));
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
  #expression = CSS_REG;
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

    const matchContent = match.groups!.content;
    const matchStartOffset = match.index + match.groups!.start.length;
    const virtualOffset = currentOffset - matchStartOffset;
    const virtualDocument = createVirtualDocument('css', removeSlot(matchContent));
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
