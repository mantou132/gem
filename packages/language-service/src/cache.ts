import type { CompletionList } from 'vscode-languageserver';
import type { Position, TextDocument } from 'vscode-languageserver-textdocument';

export class CompletionsCache {
  #cachedCompletionsFile?: string;
  #cachedCompletionsPosition?: Position;
  #cachedCompletionsContent?: string;
  #completions?: CompletionList;

  #equalPositions(left: Position, right?: Position) {
    return !!right && left.line === right.line && left.character === right.character;
  }

  getCached(doc: TextDocument, position: Position) {
    if (
      this.#completions &&
      doc.uri === this.#cachedCompletionsFile &&
      this.#equalPositions(position, this.#cachedCompletionsPosition) &&
      doc.getText() === this.#cachedCompletionsContent
    ) {
      return this.#completions;
    }

    return undefined;
  }

  updateCached(context: TextDocument, position: Position, completions: CompletionList) {
    this.#cachedCompletionsFile = context.uri;
    this.#cachedCompletionsPosition = position;
    this.#cachedCompletionsContent = context.getText();
    this.#completions = completions;
    return completions;
  }
}
