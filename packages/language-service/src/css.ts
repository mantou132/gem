import type { LanguageService as HTMLanguageService } from 'vscode-html-languageservice';
import type { Position, TextDocument } from 'vscode-languageserver-textdocument';
import { getLanguageService as getHTMLanguageService, TokenType as HTMLTokenType } from 'vscode-html-languageservice';
import { getCSSLanguageService } from 'vscode-css-languageservice';

import { matchOffset, createVirtualDocument, removeSlot, translateCompletionList } from './util';
import { CSS_REG, HTML_REG } from './constants';
import { CompletionsCache } from './cache';

function getRegionAtOffset(regions: IEmbeddedRegion[], offset: number) {
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

interface IEmbeddedRegion {
  languageId: string;
  start: number;
  end: number;
  length: number;
  content: string;
}

function getLanguageRegions(service: HTMLanguageService, data: string) {
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

export class HTMLStyleCompletionItemProvider {
  #cssLanguageService = getCSSLanguageService();
  #htmlLanguageService = getHTMLanguageService();
  #cache = new CompletionsCache();

  provideCompletionItems(document: TextDocument, position: Position) {
    const cached = this.#cache.getCached(document, position);
    if (cached) return cached;

    const currentOffset = document.offsetAt(position);
    const documentText = document.getText();
    const match = matchOffset(HTML_REG, documentText, currentOffset);

    if (!match) return;

    const matchContent = match.groups!.content;
    const matchStartOffset = match.index + match.groups!.start.length;
    const regions = getLanguageRegions(this.#htmlLanguageService, matchContent);

    if (regions.length <= 0) return;

    const region = getRegionAtOffset(regions, currentOffset - matchStartOffset);

    if (!region) return;

    const virtualOffset = currentOffset - (matchStartOffset + region.start);
    const virtualDocument = createVirtualDocument('css', removeSlot(region.content));
    const stylesheet = this.#cssLanguageService.parseStylesheet(virtualDocument);

    const completions = this.#cssLanguageService.doComplete(
      virtualDocument,
      virtualDocument.positionAt(virtualOffset),
      stylesheet,
    );

    return this.#cache.updateCached(document, position, translateCompletionList(completions, position));
  }
}

export class CSSCompletionItemProvider {
  #cssLanguageService = getCSSLanguageService();
  #cache = new CompletionsCache();

  provideCompletionItems(document: TextDocument, position: Position) {
    const cached = this.#cache.getCached(document, position);
    if (cached) return cached;

    const currentOffset = document.offsetAt(position);
    const documentText = document.getText();
    const match = matchOffset(CSS_REG, documentText, currentOffset);

    if (!match) return;

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

    return this.#cache.updateCached(document, position, translateCompletionList(completions, position));
  }
}
