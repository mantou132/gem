import type * as ts from 'typescript/lib/tsserverlibrary';
import type { TemplateLanguageService, TemplateContext } from '@mantou/typescript-template-language-service-decorator';
import type { CompletionList, Stylesheet, TextDocument, LanguageService } from '@mantou/vscode-css-languageservice';
import { getCSSLanguageService, updateTags as updateCSSTags } from '@mantou/vscode-css-languageservice';
import { doComplete as doEmmetComplete } from '@mantou/vscode-emmet-helper';

import type { Context } from './configuration';
import {
  createVirtualDocument,
  genDefaultCompletionEntryDetails,
  translateCompletionItemsToCompletionEntryDetails,
  translateCompletionItemsToCompletionInfo,
  translateHover,
} from './utils';
import type { CacheContext } from './cache';
import { LRUCache } from './cache';

export class CSSLanguageService implements TemplateLanguageService {
  #completionsCache = new LRUCache<CompletionList>();
  #diagnosticsCache = new LRUCache<ts.Diagnostic[]>();
  #virtualCssCache = new LRUCache<{ vDoc: TextDocument; vCss: Stylesheet }>();
  #cssLanguageService: LanguageService;
  #ctx: Context;

  constructor(ctx: Context) {
    this.#ctx = ctx;
    this.#cssLanguageService = getCSSLanguageService({});
  }

  #getCssDoc(context: CacheContext) {
    return this.#virtualCssCache.get(context, () => {
      const vDoc = createVirtualDocument('css', context.text);
      const vCss = this.#cssLanguageService.parseStylesheet(vDoc);
      return { vDoc, vCss };
    });
  }

  #normalize(context: TemplateContext, position: ts.LineAndCharacter) {
    const parent = context.node.parent;
    const tag = context.typescript.isTaggedTemplateExpression(parent) && parent.tag.getText();
    const isStyle = context.typescript.isPropertyAssignment(parent) || tag === 'styled';

    if (!isStyle) return { offset: 0, text: context.text, pos: { ...position } };

    const appendBefore = '.parent { ';
    const appendAfter = ' }';
    const character = position.line === 0 ? position.character + appendBefore.length : position.character;
    return {
      offset: appendBefore.length,
      text: `${appendBefore}${context.text}${appendAfter}`,
      pos: { line: position.line, character },
    };
  }

  #getCompletionsAtPosition(context: TemplateContext, position: ts.LineAndCharacter) {
    const cached = this.#completionsCache.getCached(context, position);
    if (cached) return cached;

    const { text, pos } = this.#normalize(context, position);
    const { vDoc, vCss } = this.#getCssDoc({ fileName: context.fileName, text });

    let emmetResults: CompletionList | undefined;
    const onCssProperty = () => (emmetResults = doEmmetComplete(vDoc, pos, 'css', this.#ctx.config.emmet));
    this.#cssLanguageService.setCompletionParticipants([{ onCssProperty }]);
    updateCSSTags([...this.#ctx.elements].map(([tag]) => tag));
    const completions = this.#cssLanguageService.doComplete(vDoc, pos, vCss);

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
    const { vDoc, vCss } = this.#getCssDoc({ fileName: context.fileName, text });
    const hover = this.#cssLanguageService.doHover(vDoc, pos, vCss, {
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
    const { vDoc, vCss } = this.#getCssDoc({ fileName: context.fileName, text });
    const oDiagnostics = this.#cssLanguageService.doValidation(vDoc, vCss);
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
