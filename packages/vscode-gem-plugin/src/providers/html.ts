// eslint-disable-next-line import/no-unresolved
import { workspace } from 'vscode';
import type {
  CompletionList,
  CompletionItem,
  TextDocument,
  Position,
  CancellationToken,
  CompletionItemProvider,
} from 'vscode';
import type {
  LanguageService as HTMLanguageService,
  CompletionList as HTMLCompletionList,
} from 'vscode-html-languageservice';
import { getLanguageService as getHTMLanguageService } from 'vscode-html-languageservice';
import { doComplete as doEmmetComplete } from '@vscode/emmet-helper';
import type { VSCodeEmmetConfig } from '@vscode/emmet-helper';

import { matchOffset, createVirtualDocument, translateCompletionList, removeHTMLSlot } from '../util';
import { CompletionsCache } from '../cache';
import { HTML_REG } from '../constants';

export function getEmmetConfiguration() {
  const emmetConfig = workspace.getConfiguration('emmet');
  return {
    useNewEmmet: true,
    showExpandedAbbreviation: emmetConfig.showExpandedAbbreviation,
    showAbbreviationSuggestions: emmetConfig.showAbbreviationSuggestions,
    syntaxProfiles: emmetConfig.syntaxProfiles,
    variables: emmetConfig.variables,
  } as VSCodeEmmetConfig;
}

export class HTMLCompletionItemProvider implements CompletionItemProvider {
  #htmlLanguageService: HTMLanguageService = getHTMLanguageService();
  #cache = new CompletionsCache();

  provideCompletionItems(document: TextDocument, position: Position, _token: CancellationToken) {
    const cached = this.#cache.getCached(document, position);
    if (cached) return cached;

    const currentLine = document.lineAt(position.line);
    const empty: CompletionList = { isIncomplete: false, items: [] };

    if (currentLine.isEmptyOrWhitespace) return empty;

    const currentOffset = document.offsetAt(position);
    const documentText = removeHTMLSlot(document.getText(), currentOffset);
    const match = matchOffset(HTML_REG, documentText, currentOffset);

    if (!match) return empty;

    const matchContent = match.groups!.content;
    const matchStartOffset = match.index + match.groups!.start.length;
    const virtualOffset = currentOffset - matchStartOffset;
    const virtualDocument = createVirtualDocument('html', matchContent);
    const vHtml = this.#htmlLanguageService.parseHTMLDocument(virtualDocument);

    let emmetResults: HTMLCompletionList = { isIncomplete: true, items: [] };
    this.#htmlLanguageService.setCompletionParticipants([
      {
        onHtmlContent: () =>
          (emmetResults =
            doEmmetComplete(
              virtualDocument,
              virtualDocument.positionAt(virtualOffset),
              'html',
              getEmmetConfiguration(),
            ) || emmetResults),
      },
    ]);

    const completions = this.#htmlLanguageService.doComplete(
      virtualDocument,
      virtualDocument.positionAt(virtualOffset),
      vHtml,
    );

    if (emmetResults.items.length) {
      completions.isIncomplete = true;
      completions.items.push(...emmetResults.items);
    }

    return this.#cache.updateCached(document, position, translateCompletionList(completions, currentLine, true));
  }

  resolveCompletionItem(item: CompletionItem, _token: CancellationToken) {
    return item;
  }
}
