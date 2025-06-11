import type { TemplateContext, TemplateLanguageService } from '@mantou/typescript-template-language-service-decorator';
import type { CompletionList, Node, Stylesheet } from '@mantou/vscode-css-languageservice';
import { NodeType } from '@mantou/vscode-css-languageservice';
import { doComplete as doEmmetComplete } from '@mantou/vscode-emmet-helper';
import type * as ts from 'typescript/lib/tsserverlibrary';

import { LRUCache } from './cache';
import { NAME } from './constants';
import type { Context } from './context';
import {
  genCurrentCtxCssDefinitionInfo,
  genCurrentCtxDefinitionInfo,
  genDefaultCompletionEntryDetails,
  genElementDefinitionInfo,
  translateCompletionItemsToCompletionEntryDetails,
  translateCompletionItemsToCompletionInfo,
  translateFoldingRange,
  translateHover,
} from './translates';
import { forEachNode, getAllStyleNode, getTemplateNode, isClassMapKey } from './utils';

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
      this.#ctx.prepareComplete(context.node);
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

  getReferencesAtPosition(context: TemplateContext, position: ts.LineAndCharacter): ts.ReferenceEntry[] | undefined {
    const typeChecker = this.#ctx.getProgram().getTypeChecker();
    const { text, offset } = this.#normalize(context, position);
    const { vCss } = this.#ctx.getCssDoc(text);
    const node = vCss.findChildAtOffset(context.toOffset(position) + offset, true);
    const result: ts.ReferenceEntry[] = [];
    if (node?.type === NodeType.IdentifierSelector || node?.parent?.type === NodeType.ClassSelector) {
      const classOrId = node.getText();
      for (const [, decl] of this.#ctx.elements) {
        const { fileName } = decl.getSourceFile();
        const styles = getAllStyleNode(context.typescript, typeChecker, decl);
        if (!styles.includes(context.node)) continue;
        forEachNode(decl.getChildren(), (node) => {
          const templateNode = getTemplateNode(context.typescript, node);
          if (templateNode) {
            const templateContext = this.#ctx.htmlSourceHelper.getTemplate(fileName, templateNode.pos + 1);
            if (!templateContext) return;
            const { classIdNodeMap } = this.#ctx.getHtmlDoc(templateContext.text);
            classIdNodeMap.get(classOrId)?.forEach((n) => {
              result.push({
                fileName,
                textSpan: { start: n.start + templateNode.pos - context.node.pos, length: n.length },
                isWriteAccess: true,
              });
            });
          } else if (isClassMapKey(context.typescript, node) && node.text === classOrId) {
            const isString = context.typescript.isStringLiteral(node);
            result.push({
              fileName,
              textSpan: {
                start: node.getStart() - context.node.pos - 1 + (isString ? 1 : 0),
                length: node.text.length,
              },
              isWriteAccess: true,
            });
          }
        });
      }
    }
    if (node?.parent?.type === NodeType.Property) {
      forEachIdent(vCss, node.getText(), (cssNode) => {
        result.push({
          fileName: context.fileName,
          textSpan: { start: cssNode.offset - offset, length: cssNode.end - cssNode.offset },
          isWriteAccess: true,
        });
      });
    }
    return result;
  }

  getDefinitionAndBoundSpan(context: TemplateContext, position: ts.LineAndCharacter): ts.DefinitionInfoAndBoundSpan {
    const { text, offset } = this.#normalize(context, position);
    const { vCss, customPropNodeMap } = this.#ctx.getCssDoc(text);
    const empty = { textSpan: { start: 0, length: 0 } };
    const node = vCss.findChildAtOffset(context.toOffset(position) + offset, true);
    if (!node) return empty;
    const textSpan = { start: node.offset - offset, length: node.length };
    if (
      node.type === NodeType.IdentifierSelector ||
      node.parent?.type === NodeType.ClassSelector ||
      node.parent?.parent?.type === NodeType.CustomPropertyDeclaration
    ) {
      return genCurrentCtxDefinitionInfo(context, textSpan, textSpan);
    }
    const propDefinitions = customPropNodeMap.get(node.getText());
    if (node.type === NodeType.Identifier && propDefinitions) {
      return genCurrentCtxCssDefinitionInfo(context, node.getText(), node.offset - offset, [
        { ctx: context, nodes: propDefinitions, offset },
      ]);
    }
    if (node.parent?.type !== NodeType.ElementNameSelector) return empty;
    const definitionNode = this.#ctx.elements.get(node.getText());
    if (!definitionNode) return empty;
    return genElementDefinitionInfo(context, textSpan, definitionNode);
  }

  // 不知道如何起作用的，没有被调用，但不加就没有 css 折叠了
  getOutliningSpans(context: TemplateContext): ts.OutliningSpan[] {
    const { vDoc } = this.#ctx.getHtmlDoc(context.text);
    const ranges = this.#ctx.cssLanguageService.getFoldingRanges(vDoc);
    return ranges.map((range) => translateFoldingRange(context, range));
  }
}

function forEachIdent(vCss: Stylesheet, customPropName: string, fn: (ident: Node) => void) {
  forEachNode(vCss.getChildren(), (ident) => {
    if (ident.type !== NodeType.Identifier || ident.getText() !== customPropName) return;
    if (ident.parent?.type !== NodeType.Term && ident?.parent?.type !== NodeType.Property) return;
    fn(ident);
  });
}
