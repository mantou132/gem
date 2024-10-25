// Code from https://github.com/Microsoft/typescript-styled-plugin/blob/master/src/styled-template-language-service.ts

import type { CompletionList, TextDocument, Position } from 'vscode';

export class CompletionsCache {
  #cachedCompletionsFile?: string;
  #cachedCompletionsPosition?: Position;
  #cachedCompletionsContent?: string;
  #completions?: CompletionList;

  #equalPositions(left: Position, right?: Position): boolean {
    return !!right && left.line === right.line && left.character === right.character;
  }

  getCached(context: TextDocument, position: Position): CompletionList | undefined {
    if (
      this.#completions &&
      context.fileName === this.#cachedCompletionsFile &&
      this.#equalPositions(position, this.#cachedCompletionsPosition) &&
      context.getText() === this.#cachedCompletionsContent
    ) {
      return this.#completions;
    }

    return undefined;
  }

  updateCached(context: TextDocument, position: Position, completions: CompletionList) {
    this.#cachedCompletionsFile = context.fileName;
    this.#cachedCompletionsPosition = position;
    this.#cachedCompletionsContent = context.getText();
    this.#completions = completions;
    return completions;
  }
}
