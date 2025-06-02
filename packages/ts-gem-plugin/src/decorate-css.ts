import type { TemplateContext, TemplateLanguageService } from '@mantou/typescript-template-language-service-decorator';
import type { CompletionList } from '@mantou/vscode-css-languageservice';
import { NodeType, updateTags as updateCSSTags } from '@mantou/vscode-css-languageservice';
import { doComplete as doEmmetComplete } from '@mantou/vscode-emmet-helper';
import type * as ts from 'typescript/lib/tsserverlibrary';

import { LRUCache } from './cache';
import { NAME } from './constants';
import type { Context } from './context';
import {
  genDefaultCompletionEntryDetails,
  genElementDefinitionInfo,
  translateCompletionItemsToCompletionEntryDetails,
  translateCompletionItemsToCompletionInfo,
  translateFoldingRange,
  translateHover,
} from './translates';

export class CSSLanguageService implements TemplateLanguageService {
  #completionsCache = new LRUCache<CompletionList>({ max: 1 });
  #diagnosticsCache = new LRUCache<ts.Diagnostic[]>();
  #ctx: Context;

  constructor(ctx: Context) {
    this.#ctx = ctx;
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
    return this.#completionsCache.get(context, position, () => {
      const { text, pos } = this.#normalize(context, position);
      const { vDoc, vCss } = this.#ctx.getCssDoc(text);

      let emmetResults: CompletionList | undefined;
      const onCssProperty = () => (emmetResults = doEmmetComplete(vDoc, pos, 'css', this.#ctx.config.emmet));
      this.#ctx.cssLanguageService.setCompletionParticipants([{ onCssProperty }]);
      updateCSSTags([...this.#ctx.elements].map(([tag]) => tag));
      const completions = this.#ctx.cssLanguageService.doComplete(vDoc, pos, vCss);

      completions.items.push(...(emmetResults?.items || []));
      return completions;
    });
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
    const { vDoc, vCss } = this.#ctx.getCssDoc(text);
    const hover = this.#ctx.cssLanguageService.doHover(vDoc, pos, vCss, {
      documentation: true,
      references: true,
    });
    if (!hover) return;

    return translateHover(context, hover, position, pos.character - position.character);
  }

  #getSyntacticDiagnostics(context: TemplateContext): ts.Diagnostic[] {
    const { text, offset } = this.#normalize(context, { line: 0, character: 0 });
    const { vDoc, vCss } = this.#ctx.getCssDoc(text);
    const oDiagnostics = this.#ctx.cssLanguageService.doValidation(vDoc, vCss);
    const file = this.#ctx.getProgram().getSourceFile(context.fileName);
    return oDiagnostics.map(({ message, range }) => {
      const start = context.toOffset(range.start);
      return {
        category: context.typescript.DiagnosticCategory.Warning,
        code: 0,
        file,
        start: range.start.line === 0 ? start - offset : start,
        length: context.toOffset(range.end) - start,
        messageText: message,
        source: NAME,
      };
    });
  }

  getSyntacticDiagnostics(context: TemplateContext): ts.Diagnostic[] {
    this.#ctx.initElements();
    return this.#diagnosticsCache.get(context, undefined, () => this.#getSyntacticDiagnostics(context));
  }

  getDefinitionAndBoundSpan(context: TemplateContext, position: ts.LineAndCharacter): ts.DefinitionInfoAndBoundSpan {
    const { text, offset } = this.#normalize(context, position);
    const { vDoc, vCss } = this.#ctx.getCssDoc(text);
    const empty = { textSpan: { start: 0, length: 0 } };
    const node = vCss.findChildAtOffset(context.toOffset(position), true);
    if (!node || node.parent?.type !== NodeType.ElementNameSelector) return empty;
    const ident = vDoc.getText().slice(node.offset, node.end);
    const definitionNode = this.#ctx.elements.get(ident);
    if (!definitionNode) return empty;
    return genElementDefinitionInfo(context, { start: node.offset - offset, length: node.length }, definitionNode);
  }

  // 不知道如何起作用的，没有被调用，但不加就没有 css 折叠了
  getOutliningSpans(context: TemplateContext): ts.OutliningSpan[] {
    const { vDoc } = this.#ctx.getHtmlDoc(context.text);
    const ranges = this.#ctx.cssLanguageService.getFoldingRanges(vDoc);
    return ranges.map((range) => translateFoldingRange(context, range));
  }
}
