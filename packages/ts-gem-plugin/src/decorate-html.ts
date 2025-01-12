import type * as ts from 'typescript/lib/tsserverlibrary';
import type { TemplateLanguageService, TemplateContext } from '@mantou/typescript-template-language-service-decorator';
import type {
  CompletionList,
  HTMLDocument,
  IAttributeData,
  ITagData,
  Position,
  Range,
} from 'vscode-html-languageservice';
import { getDefaultHTMLDataProvider, getLanguageService as getHTMLanguageService } from 'vscode-html-languageservice';
import { doComplete as doEmmetComplete } from '@vscode/emmet-helper';
import { getCSSLanguageService } from 'vscode-css-languageservice';
import { isNotNullish } from 'duoyun-ui/lib/types';
import { kebabToCamelCase } from '@mantou/gem/lib/utils';

import type { Context } from './configuration';
import {
  createVirtualDocument,
  genDefaultCompletionEntryDetails,
  getAttrName,
  getDocComment,
  getHTMLTextAtPosition,
  isCustomElement,
  isDepElement,
  translateCompletionItemsToCompletionEntryDetails,
  translateCompletionItemsToCompletionInfo,
  translateHover,
} from './utils';
import { LRUCache } from './cache';

export class HTMLLanguageService implements TemplateLanguageService {
  #completionsCache = new LRUCache<CompletionList>();
  #diagnosticsCache = new LRUCache<ts.Diagnostic[]>();
  #cssLanguageService: ReturnType<typeof getCSSLanguageService>;
  #htmlLanguageService: ReturnType<typeof getHTMLanguageService>;
  #ctx: Context;

  constructor(ctx: Context) {
    this.#ctx = ctx;
    const ts = ctx.ts;
    const htmlDataProvider = getDefaultHTMLDataProvider();
    const provideTags = htmlDataProvider.provideTags.bind(htmlDataProvider);
    htmlDataProvider.provideTags = () => {
      const result = [...ctx.elements]
        .map<ITagData | undefined>(([tag, node]) => ({
          name: tag,
          attributes: [],
          description: getDocComment(ts, node),
        }))
        .filter(isNotNullish);
      return [...result, ...provideTags()];
    };
    const provideAttributes = htmlDataProvider.provideAttributes.bind(htmlDataProvider);
    htmlDataProvider.provideAttributes = (tag: string) => {
      const typeChecker = ctx.getProgram()!.getTypeChecker();
      const node = ctx.elements.get(tag);
      const isDep = node && isDepElement(node);
      const props = node && typeChecker.getTypeAtLocation(node).getApparentProperties();
      const result = (props || [])
        .map<IAttributeData | undefined>((e) => {
          const declaration = e.getDeclarations()?.at(0);
          const prop = declaration && ts.isPropertyDeclaration(declaration);
          if (!prop) return;
          const hasPropDecorator = declaration.modifiers?.some(
            (m) => ts.isDecorator(m) && ts.isIdentifier(m.expression),
          );
          if (!hasPropDecorator && !isDep) return;
          const type = declaration.type && typeChecker.getTypeFromTypeNode(declaration.type);
          return {
            name: type === typeChecker.getBooleanType() ? e.name : `.${e.name}`,
            description: getDocComment(ts, declaration!),
            valueSet: 'v',
          };
        })
        .filter(isNotNullish);
      return [...result, ...provideAttributes(isCustomElement(tag) ? 'div' : tag)];
    };
    this.#htmlLanguageService = getHTMLanguageService({ customDataProviders: [htmlDataProvider] });
    this.#cssLanguageService = getCSSLanguageService({ useDefaultDataProvider: true });
  }

  #getAllCssDoc(doc: HTMLDocument) {
    const styles: typeof doc.roots = [];
    const nodes = [...doc.roots];
    while (true) {
      const node = nodes.pop();
      if (!node) break;
      if (node.tag === 'style') styles.push(node);
      nodes.push(...node.children);
    }
    return styles;
  }

  #getCssDoc(context: TemplateContext, position: ts.LineAndCharacter, doc: HTMLDocument) {
    const node = doc.findNodeAt(context.toOffset(position));
    if (node.tag !== 'style') return;
    const virtualDocument = createVirtualDocument('css', context.text.slice(node.startTagEnd, node.endTagStart));
    const style = this.#cssLanguageService.parseStylesheet(virtualDocument);
    const offset = context.toOffset(position) - node.startTagEnd!;
    const toPosition = (pos: Position) => context.toPosition(virtualDocument.offsetAt(pos) + node.startTagEnd!);
    return {
      style,
      virtualDocument,
      position: virtualDocument.positionAt(offset),
      updateRange: (range: Range) => ({
        start: toPosition(range.start),
        end: toPosition(range.end),
      }),
    };
  }

  #getCSSCompletionsAtPosition(context: TemplateContext, position: ts.LineAndCharacter, doc: HTMLDocument) {
    const css = this.#getCssDoc(context, position, doc);
    if (!css) return [];
    let emmetResults: CompletionList | undefined;
    this.#cssLanguageService.setCompletionParticipants([
      {
        onCssProperty: () => {
          emmetResults = doEmmetComplete(css.virtualDocument, css.position, 'css', this.#ctx.config.emmet);
        },
      },
    ]);
    const completions = this.#cssLanguageService.doComplete(css.virtualDocument, css.position, css.style);
    completions.items.push(...(emmetResults?.items || []));
    return completions.items.map((e) => ({
      ...e,
      textEdit:
        e.textEdit && 'range' in e.textEdit
          ? {
              newText: e.textEdit.newText,
              range: css.updateRange(e.textEdit.range),
            }
          : e.textEdit,
    }));
  }

  #getCompletionsAtPosition(context: TemplateContext, position: ts.LineAndCharacter) {
    const cached = this.#completionsCache.getCached(context, position);
    if (cached) return cached;
    const virtualDocument = createVirtualDocument('html', context.text);
    const vHtml = this.#htmlLanguageService.parseHTMLDocument(virtualDocument);

    let emmetResults: CompletionList | undefined;
    this.#htmlLanguageService.setCompletionParticipants([
      {
        onHtmlContent: () => {
          emmetResults = doEmmetComplete(virtualDocument, position, 'html', this.#ctx.config.emmet);
        },
      },
    ]);

    const completions = this.#htmlLanguageService.doComplete(virtualDocument, position, vHtml);

    completions.items.push(...(emmetResults?.items || []));
    completions.items.push(...this.#getCSSCompletionsAtPosition(context, position, vHtml));

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

  #getCSSQuickInfoAtPosition(context: TemplateContext, position: ts.LineAndCharacter, doc: HTMLDocument) {
    const css = this.#getCssDoc(context, position, doc);
    const hover =
      css &&
      this.#cssLanguageService.doHover(css.virtualDocument, css.position, css.style, {
        documentation: true,
        references: true,
      });
    return (
      hover && {
        ...hover,
        range: hover.range && css.updateRange(hover.range),
      }
    );
  }

  getQuickInfoAtPosition(context: TemplateContext, position: ts.LineAndCharacter) {
    const virtualDocument = createVirtualDocument('html', context.text);
    const vHtml = this.#htmlLanguageService.parseHTMLDocument(virtualDocument);
    const hover =
      this.#htmlLanguageService.doHover(virtualDocument, position, vHtml, {
        documentation: true,
        references: true,
      }) || this.#getCSSQuickInfoAtPosition(context, position, vHtml);
    if (!hover) return;
    return translateHover(context, hover, position);
  }

  getSyntacticDiagnostics(context: TemplateContext): ts.Diagnostic[] {
    const cached = this.#diagnosticsCache.getCached(context);
    if (cached) return cached;
    const virtualDocument = createVirtualDocument('html', context.text);
    const vHtml = this.#htmlLanguageService.parseHTMLDocument(virtualDocument);
    const styles = this.#getAllCssDoc(vHtml);
    const file = this.#ctx.getProgram()!.getSourceFile(context.fileName);
    return this.#diagnosticsCache.updateCached(
      context,
      styles
        .map((node) => {
          const textDocument = createVirtualDocument('css', context.text.slice(node.startTagEnd, node.endTagStart));
          const vCss = this.#cssLanguageService.parseStylesheet(textDocument);
          const oDiagnostics = this.#cssLanguageService.doValidation(textDocument, vCss);
          return oDiagnostics.map(({ message, range }) => {
            const start = node.startTagEnd! + textDocument.offsetAt(range.start);
            const end = node.startTagEnd! + textDocument.offsetAt(range.end);
            return {
              category: context.typescript.DiagnosticCategory.Warning,
              code: 0,
              file,
              start,
              length: end - start,
              messageText: message,
            };
          });
        })
        .flat(),
    );
  }

  getDefinitionAndBoundSpan(context: TemplateContext, position: ts.LineAndCharacter): ts.DefinitionInfoAndBoundSpan {
    // typescript-template-language-service-decorator 根据当前文档位置偏移了
    const htmlOffset = context.node.pos + 1;
    const virtualDocument = createVirtualDocument('html', context.text);
    const vHtml = this.#htmlLanguageService.parseHTMLDocument(virtualDocument);
    const offset = context.toOffset(position);
    const node = vHtml.findNodeAt(offset);
    const { text, start, length } = getHTMLTextAtPosition(context.text, offset);
    const definitionNode = this.#ctx.elements.get(node.tag!);

    if (!definitionNode || node.tag === 'style' || offset > node.startTagEnd! || !text) {
      return { textSpan: { start, length } };
    }

    if (text === node.tag) {
      return {
        textSpan: { start, length },
        definitions: [
          {
            containerName: 'Custom Element',
            containerKind: context.typescript.ScriptElementKind.unknown,
            name: definitionNode.name!.text,
            kind: context.typescript.ScriptElementKind.classElement,
            fileName: definitionNode.getSourceFile().fileName,
            textSpan: {
              start: definitionNode.name!.getStart() - htmlOffset,
              length: definitionNode.name!.text.length,
            },
          },
        ],
      };
    }

    const { attr, type } = getAttrName(text);
    const typeChecker = this.#ctx.getProgram()!.getTypeChecker();
    const propSymbol = typeChecker.getTypeAtLocation(definitionNode).getProperty(kebabToCamelCase(attr));
    const propDeclaration = propSymbol?.getDeclarations()?.at(0);
    return {
      textSpan: { start: type ? start + 1 : start, length: attr.length },
      definitions: !propDeclaration
        ? undefined
        : [
            {
              containerName: 'Attribute',
              containerKind: context.typescript.ScriptElementKind.unknown,
              name: propDeclaration.getText(),
              kind: context.typescript.ScriptElementKind.memberVariableElement,
              fileName: propDeclaration.getSourceFile().fileName,
              textSpan: {
                start: propDeclaration.getStart() - htmlOffset,
                length: propDeclaration.getText().length,
              },
            },
          ],
    };
  }
}
