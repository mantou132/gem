import type * as ts from 'typescript/lib/tsserverlibrary';
import type { TemplateLanguageService, TemplateContext } from 'typescript-template-language-service-decorator';
import type { CompletionList } from 'vscode-css-languageservice';
import { getCSSLanguageService } from 'vscode-css-languageservice';
import { doComplete as doEmmetComplete } from '@vscode/emmet-helper';

import type { Context } from './decorate-ts';
import {
  createVirtualDocument,
  genDefaultCompletionEntryDetails,
  translateCompletionItemsToCompletionEntryDetails,
  translateCompletionItemsToCompletionInfo,
  translateHover,
} from './utils';
import { LRUCache } from './cache';

export class CSSLanguageService implements TemplateLanguageService {
  #completionsCache = new LRUCache<CompletionList>();
  #diagnosticsCache = new LRUCache<ts.Diagnostic[]>();
  #cssLanguageService = getCSSLanguageService();
  #ctx: Context;

  constructor(ctx: Context) {
    this.#ctx = ctx;
  }

  #normalize = (context: TemplateContext, position: ts.LineAndCharacter) => {
    const tagged = context.node.parent;
    const tag = context.typescript.isTaggedTemplateExpression(tagged) && tagged.tag.getText();
    if (tag === 'styled') {
      const appendBefore = '.parent { ';
      const appendAfter = ' }';
      return {
        offset: appendBefore.length,
        text: `${appendBefore}${context.text}${appendAfter}`,
        pos: {
          line: position.line,
          character: position.line === 0 ? position.character + appendBefore.length : position.character,
        },
      };
    }
    return {
      offset: 0,
      text: context.text,
      pos: { ...position },
    };
  };

  #getCompletionsAtPosition(context: TemplateContext, position: ts.LineAndCharacter) {
    const cached = this.#completionsCache.getCached(context, position);
    if (cached) return cached;
    const { text, pos } = this.#normalize(context, position);
    const virtualDocument = createVirtualDocument('css', text);
    const vCss = this.#cssLanguageService.parseStylesheet(virtualDocument);
    let emmetResults: CompletionList | undefined;
    this.#cssLanguageService.setCompletionParticipants([
      {
        onCssProperty: () => {
          emmetResults = doEmmetComplete(virtualDocument, pos, 'css', this.#ctx.config.emmet);
        },
      },
    ]);
    const completions = this.#cssLanguageService.doComplete(virtualDocument, pos, vCss);
    completions.items.push(...(emmetResults?.items || []));
    return this.#completionsCache.updateCached(context, position, completions);
  }

  getCompletionsAtPosition(context: TemplateContext, position: ts.LineAndCharacter) {
    return translateCompletionItemsToCompletionInfo(context, this.#getCompletionsAtPosition(context, position));
  }

  getCompletionEntryDetails(
    context: TemplateContext,
    position: ts.LineAndCharacter,
    name: string,
  ): ts.CompletionEntryDetails {
    const completions = this.#getCompletionsAtPosition(context, position);
    const item = completions.items.find((e) => e.label === name);
    if (!item) return genDefaultCompletionEntryDetails(context, name);
    return translateCompletionItemsToCompletionEntryDetails(context, item);
  }

  getQuickInfoAtPosition(context: TemplateContext, position: ts.LineAndCharacter) {
    const { text, pos } = this.#normalize(context, position);
    const virtualDocument = createVirtualDocument('css', text);
    const vCss = this.#cssLanguageService.parseStylesheet(virtualDocument);
    const hover = this.#cssLanguageService.doHover(virtualDocument, pos, vCss, {
      documentation: true,
      references: true,
    });
    if (!hover) return;
    return translateHover(context, hover, position, pos.character - position.character);
  }

  getSyntacticDiagnostics(context: TemplateContext): ts.Diagnostic[] {
    const cached = this.#diagnosticsCache.getCached(context);
    if (cached) return cached;
    const { text, offset } = this.#normalize(context, { line: 0, character: 0 });
    const virtualDocument = createVirtualDocument('css', text);
    const vCss = this.#cssLanguageService.parseStylesheet(virtualDocument);
    const oDiagnostics = this.#cssLanguageService.doValidation(virtualDocument, vCss);
    const file = this.#ctx.getProgram()!.getSourceFile(context.fileName);
    return this.#diagnosticsCache.updateCached(
      context,
      oDiagnostics.map(({ message, range }) => {
        const start = context.toOffset(range.start);
        return {
          category: context.typescript.DiagnosticCategory.Warning,
          code: 0,
          file,
          start: range.start.line === 0 ? start - offset : start,
          length: context.toOffset(range.end) - start,
          messageText: message,
        };
      }),
    );
  }
}
