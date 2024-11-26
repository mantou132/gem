import { Position, Range } from 'vscode-languageserver/node';
import { getLanguageService as getHtmlLanguageService } from 'vscode-html-languageservice';
import { getCSSLanguageService } from 'vscode-css-languageservice';
import type { LanguageService as CssLanguageService } from 'vscode-css-languageservice';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { Hover } from 'vscode-languageserver/node';

import { createVirtualDocument, matchOffset, removeHTMLSlot, removeSlot } from './util';
import { CSS_REG, HTML_REG, SLOT_TOKEN, STYLE_REG } from './constants';

function translateHover(hover: Hover | null, position: Position): Hover | null {
  if (!hover) return hover;
  return {
    ...hover,
    range:
      hover.range &&
      Range.create(
        Position.create(position.line, hover.range.start.character),
        Position.create(position.line, hover.range.end.character),
      ),
  };
}

export class HTMLHoverProvider {
  #htmlLanguageService = getHtmlLanguageService();

  provideHover(document: TextDocument, position: Position) {
    const currentOffset = document.offsetAt(position);
    const documentText = removeHTMLSlot(document.getText(), currentOffset);
    const match = matchOffset(HTML_REG, documentText, currentOffset);

    if (!match) return null;

    const matchContent = match.groups!.content;
    const matchStartOffset = match.index + match.groups!.start.length;
    const virtualOffset = currentOffset - matchStartOffset;
    const virtualDocument = createVirtualDocument('html', matchContent);
    const html = this.#htmlLanguageService.parseHTMLDocument(virtualDocument);
    return translateHover(
      this.#htmlLanguageService.doHover(virtualDocument, virtualDocument.positionAt(virtualOffset), html, {
        documentation: true,
        references: true,
      }),
      position,
    );
  }
}

export class CSSHoverProvider {
  #cssLanguageService: CssLanguageService = getCSSLanguageService();

  provideHover(document: TextDocument, position: Position) {
    const currentOffset = document.offsetAt(position);
    const documentText = document.getText();
    const match = matchOffset(CSS_REG, documentText, currentOffset);

    if (!match) return null;

    const matchContent = match.groups!.content;
    const content = removeSlot(matchContent);
    const matchStartOffset = match.index + match.groups!.start.length;
    const virtualOffset = currentOffset - matchStartOffset;

    if (content[virtualOffset] === SLOT_TOKEN) return null;

    const virtualDocument = createVirtualDocument('css', content);
    const stylesheet = this.#cssLanguageService.parseStylesheet(virtualDocument);
    return translateHover(
      this.#cssLanguageService.doHover(virtualDocument, virtualDocument.positionAt(virtualOffset), stylesheet, {
        documentation: true,
        references: true,
      }),
      position,
    );
  }
}

export class StyleHoverProvider {
  #cssLanguageService: CssLanguageService = getCSSLanguageService();

  provideHover(document: TextDocument, position: Position) {
    const currentOffset = document.offsetAt(position);
    const documentText = document.getText();
    const match = matchOffset(STYLE_REG, documentText, currentOffset);

    if (!match) return null;

    const matchContent = match.groups!.content;
    const content = `.parent { ${removeSlot(matchContent)} }`;
    const matchStartOffset = match.index + match.groups!.start.length;
    const virtualOffset = currentOffset - matchStartOffset + 9;

    if (content[virtualOffset] === SLOT_TOKEN) return null;

    const virtualDocument = createVirtualDocument('css', content);
    const stylesheet = this.#cssLanguageService.parseStylesheet(virtualDocument);
    return translateHover(
      this.#cssLanguageService.doHover(virtualDocument, virtualDocument.positionAt(virtualOffset), stylesheet, {
        documentation: true,
        references: true,
      }),
      position,
    );
  }
}
