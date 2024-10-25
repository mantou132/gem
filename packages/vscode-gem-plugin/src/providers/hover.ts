// eslint-disable-next-line import/no-unresolved
import { Hover, MarkdownString } from 'vscode';
import { getLanguageService as getHtmlLanguageService } from 'vscode-html-languageservice';
import { getCSSLanguageService as getCssLanguageService } from 'vscode-css-languageservice';
import type { HoverProvider, TextDocument, Position, CancellationToken } from 'vscode';
import type { LanguageService as HtmlLanguageService, Hover as HtmlHover } from 'vscode-html-languageservice';
import type { LanguageService as CssLanguageService } from 'vscode-css-languageservice';

import { createVirtualDocument, matchOffset } from '../util';

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
  #htmlLanguageService: HtmlLanguageService = getHtmlLanguageService();
  #expression = /(\/\*\s*html\s*\*\/\s*`|(?<!`)(?:html|raw)\s*`)([^`]*)(`)/gi;

  provideHover(document: TextDocument, position: Position, _token: CancellationToken) {
    const currentOffset = document.offsetAt(position);
    const documentText = document.getText();
    const match = matchOffset(this.#expression, documentText, currentOffset);

    if (!match) return null;

    const matchContent = match[2];
    const matchStartOffset = match.index + match[1].length;
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
  #expression = /(\/\*\s*(css|less|scss)\s*\*\/\s*`|(?:css|createCSSSheet|stylesheet)\s*`)([^`]*)(`)/gi;

  provideHover(document: TextDocument, position: Position, _token: CancellationToken) {
    const currentOffset = document.offsetAt(position);
    const documentText = document.getText();
    const match = matchOffset(this.#expression, documentText, currentOffset);

    if (!match) return null;

    const dialect = match[2];

    const matchContent = match[3];
    const matchStartOffset = match.index + match[1].length;
    const virtualOffset = currentOffset - matchStartOffset;
    const virtualDocument = createVirtualDocument(dialect, matchContent);
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
  #expression = /(\/\*\s*(style)\s*\*\/\s*`|styled?\s*`)([^`]*)(`)/gi;

  provideHover(document: TextDocument, position: Position, _token: CancellationToken) {
    const currentOffset = document.offsetAt(position);
    const documentText = document.getText();
    const match = matchOffset(this.#expression, documentText, currentOffset);

    if (!match) return null;

    const matchContent = match[3];
    const matchStartOffset = match.index + match[1].length;
    const virtualOffset = currentOffset - matchStartOffset + 8;
    const virtualDocument = createVirtualDocument('css', `:host { ${matchContent} }`);
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
