// eslint-disable-next-line import/no-unresolved
import { Hover, MarkdownString } from 'vscode';
import { getLanguageService as getHtmlLanguageService } from 'vscode-html-languageservice';
import { getCSSLanguageService as getCssLanguageService } from 'vscode-css-languageservice';
import type { HoverProvider, TextDocument, Position, CancellationToken } from 'vscode';
import type { Hover as HtmlHover } from 'vscode-html-languageservice';
import type { LanguageService as CssLanguageService } from 'vscode-css-languageservice';

import { createVirtualDocument, matchOffset, removeHTMLSlot, removeSlot } from '../util';
import { CSS_REG, HTML_REG, STYLE_REG } from '../constants';

function translateHover(hover: HtmlHover | null): Hover | null {
  if (!hover) return null;
  const { contents } = hover;
  if (typeof contents === 'object' && 'kind' in contents) {
    const markedStr = new MarkdownString();
    if (contents.kind === 'plaintext') {
      markedStr.appendText(contents.value);
    } else {
      markedStr.appendMarkdown(contents.value);
    }
    return new Hover(markedStr);
  }
  return new Hover(contents);
}

export class HTMLHoverProvider implements HoverProvider {
  #htmlLanguageService = getHtmlLanguageService();

  provideHover(document: TextDocument, position: Position, _token: CancellationToken) {
    const currentOffset = document.offsetAt(position);
    const documentText = removeHTMLSlot(document.getText(), currentOffset);
    const match = matchOffset(HTML_REG, documentText, currentOffset);

    if (!match) return null;

    const matchContent = match.groups!.content;
    const matchStartOffset = match.index + match.groups!.start.length;
    const virtualOffset = currentOffset - matchStartOffset;
    const virtualDocument = createVirtualDocument('html', matchContent);
    const html = this.#htmlLanguageService.parseHTMLDocument(virtualDocument);
    const hover = this.#htmlLanguageService.doHover(virtualDocument, virtualDocument.positionAt(virtualOffset), html, {
      documentation: true,
      references: true,
    });

    return translateHover(hover);
  }
}

export class CSSHoverProvider implements HoverProvider {
  #cssLanguageService: CssLanguageService = getCssLanguageService();

  provideHover(document: TextDocument, position: Position, _token: CancellationToken) {
    const currentOffset = document.offsetAt(position);
    const documentText = document.getText();
    const match = matchOffset(CSS_REG, documentText, currentOffset);

    if (!match) return null;

    const matchContent = match.groups!.content;
    const matchStartOffset = match.index + match.groups!.start.length;
    const virtualOffset = currentOffset - matchStartOffset;
    const virtualDocument = createVirtualDocument('css', removeSlot(matchContent));
    const stylesheet = this.#cssLanguageService.parseStylesheet(virtualDocument);
    const hover = this.#cssLanguageService.doHover(
      virtualDocument,
      virtualDocument.positionAt(virtualOffset),
      stylesheet,
      {
        documentation: true,
        references: true,
      },
    );

    return translateHover(hover);
  }
}

export class StyleHoverProvider implements HoverProvider {
  #cssLanguageService: CssLanguageService = getCssLanguageService();

  provideHover(document: TextDocument, position: Position, _token: CancellationToken) {
    const currentOffset = document.offsetAt(position);
    const documentText = document.getText();
    const match = matchOffset(STYLE_REG, documentText, currentOffset);

    if (!match) return null;

    const matchContent = match.groups!.content;
    const matchStartOffset = match.index + match.groups!.start.length;
    const virtualOffset = currentOffset - matchStartOffset + 8;
    const virtualDocument = createVirtualDocument('css', `:host { ${removeSlot(matchContent)} }`);
    const stylesheet = this.#cssLanguageService.parseStylesheet(virtualDocument);
    const hover = this.#cssLanguageService.doHover(
      virtualDocument,
      virtualDocument.positionAt(virtualOffset),
      stylesheet,
      {
        documentation: true,
        references: true,
      },
    );

    return translateHover(hover);
  }
}
