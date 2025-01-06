import type * as ts from 'typescript/lib/tsserverlibrary';
import type { TemplateLanguageService, TemplateContext } from 'typescript-template-language-service-decorator';
import { getCSSLanguageService } from 'vscode-css-languageservice';

import type { Context } from './decorate-ts';
import { createVirtualDocument, translateCompletionItemsToCompletionInfo, translateHover } from './utils';

export class CSSLanguageService implements TemplateLanguageService {
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

  getCompletionsAtPosition(context: TemplateContext, position: ts.LineAndCharacter) {
    const { text, pos } = this.#normalize(context, position);
    const virtualDocument = createVirtualDocument('css', text);
    const vCss = this.#cssLanguageService.parseStylesheet(virtualDocument);
    const completions = this.#cssLanguageService.doComplete(virtualDocument, pos, vCss);
    return translateCompletionItemsToCompletionInfo(context, completions);
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
    const { text, offset } = this.#normalize(context, { line: 0, character: 0 });
    const virtualDocument = createVirtualDocument('css', text);
    const vCss = this.#cssLanguageService.parseStylesheet(virtualDocument);
    const oDiagnostics = this.#cssLanguageService.doValidation(virtualDocument, vCss);
    const file = this.#ctx.getProgram()!.getSourceFile(context.fileName);
    return oDiagnostics.map(({ message, range }) => {
      const start = context.toOffset(range.start);
      return {
        category: context.typescript.DiagnosticCategory.Warning,
        code: 0,
        file,
        start: range.start.line === 0 ? start - offset : start,
        length: context.toOffset(range.end) - start,
        messageText: message,
      };
    });
  }
}
