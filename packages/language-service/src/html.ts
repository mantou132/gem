import type { CompletionList as HTMLCompletionList } from 'vscode-html-languageservice';
import { getLanguageService as getHTMLanguageService } from 'vscode-html-languageservice';
import { doComplete as doEmmetComplete, type VSCodeEmmetConfig } from '@vscode/emmet-helper';
import type { Position, TextDocument } from 'vscode-languageserver-textdocument';
import type { Connection } from 'vscode-languageserver';

import { matchOffset, createVirtualDocument, removeHTMLSlot, translateCompletionList } from './util';
import { HTML_REG } from './constants';
import { CompletionsCache } from './cache';

export class HTMLCompletionItemProvider {
  #htmlLanguageService = getHTMLanguageService();
  #cache = new CompletionsCache();
  #connection: Connection;
  #emmetConfig: VSCodeEmmetConfig;

  constructor(connection: Connection) {
    this.#connection = connection;
  }

  async #getEmmetConfig() {
    if (!this.#emmetConfig) {
      this.#emmetConfig = (await this.#connection.workspace.getConfiguration('emmet')) || {};
    }
    return this.#emmetConfig;
  }

  async provideCompletionItems(document: TextDocument, position: Position) {
    const emmetConfig = await this.#getEmmetConfig();
    const cached = this.#cache.getCached(document, position);
    if (cached) return cached;

    const currentOffset = document.offsetAt(position);
    const documentText = removeHTMLSlot(document.getText(), currentOffset);
    const match = matchOffset(HTML_REG, documentText, currentOffset);

    if (!match) return;

    const matchContent = match.groups!.content;
    const matchStartOffset = match.index + match.groups!.start.length;
    const virtualOffset = currentOffset - matchStartOffset;
    const virtualDocument = createVirtualDocument('html', matchContent);
    const vHtml = this.#htmlLanguageService.parseHTMLDocument(virtualDocument);

    let emmetResults: HTMLCompletionList = { isIncomplete: true, items: [] };
    this.#htmlLanguageService.setCompletionParticipants([
      {
        onHtmlContent: async () => {
          const pos = virtualDocument.positionAt(virtualOffset);
          const result = doEmmetComplete(virtualDocument, pos, 'html', emmetConfig);
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

    const completions = this.#htmlLanguageService.doComplete(
      virtualDocument,
      virtualDocument.positionAt(virtualOffset),
      vHtml,
    );

    if (emmetResults.items.length) {
      completions.items.push(...emmetResults.items);
    }

    return this.#cache.updateCached(document, position, translateCompletionList(completions, position));
  }
}
