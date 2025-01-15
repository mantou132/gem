import type * as ts from 'typescript/lib/tsserverlibrary';
import type { TemplateLanguageService, TemplateContext } from '@mantou/typescript-template-language-service-decorator';
import type {
  CompletionList,
  HTMLDocument,
  IAttributeData,
  IHTMLDataProvider,
  Position,
  Range,
  TextDocument,
} from '@mantou/vscode-html-languageservice';
import {
  getDefaultHTMLDataProvider,
  getLanguageService as getHTMLanguageService,
} from '@mantou/vscode-html-languageservice';
import { doComplete as doEmmetComplete, updateTags } from '@mantou/vscode-emmet-helper';
import type { Stylesheet } from '@mantou/vscode-css-languageservice';
import { getCSSLanguageService, updateTags as updateCSSTags } from '@mantou/vscode-css-languageservice';
import { kebabToCamelCase } from '@mantou/gem/lib/utils';

import type { Context } from './configuration';
import {
  createVirtualDocument,
  genDefaultCompletionEntryDetails,
  getAttrName,
  getDocComment,
  getHTMLTextAtPosition,
  isCustomElementTag,
  isDepElement,
  getBasicUnionValues,
  translateCompletionItemsToCompletionEntryDetails,
  translateCompletionItemsToCompletionInfo,
  translateHover,
} from './utils';
import type { CacheContext } from './cache';
import { LRUCache } from './cache';

const dataProvider = getDefaultHTMLDataProvider();

class HTMLDataProvider implements IHTMLDataProvider {
  #ctx: Context;
  constructor(ctx: Context) {
    this.#ctx = ctx;
  }

  getId() {
    return 'gem';
  }

  isApplicable() {
    return true;
  }

  provideTags() {
    const { elements, ts } = this.#ctx;
    return [...elements].map(([tag, node]) => ({
      name: tag,
      attributes: [],
      description: getDocComment(ts, node),
    }));
  }

  provideAttributes(tag: string) {
    const { elements, ts, getProgram } = this.#ctx;
    const typeChecker = getProgram()!.getTypeChecker();
    const node = elements.get(tag);
    if (!node) return [];
    const isDep = isDepElement(node);
    const result: IAttributeData[] = [];
    const props = typeChecker.getTypeAtLocation(node).getApparentProperties();
    // TODO: props, attributes
    props.forEach((e) => {
      const declaration = e.getDeclarations()?.at(0);
      const prop = declaration && ts.isPropertyDeclaration(declaration);
      if (!prop) return;
      const hasPropDecorator = declaration.modifiers?.some((m) => ts.isDecorator(m) && ts.isIdentifier(m.expression));
      if (!hasPropDecorator && !isDep) return;
      const type = declaration.type && typeChecker.getTypeFromTypeNode(declaration.type);
      const typeText = declaration.type?.getText();
      const description = getDocComment(ts, declaration!);
      switch (type) {
        case typeChecker.getStringType():
        case typeChecker.getNumberType():
          result.push({ name: e.name, description });
          break;
        case typeChecker.getBooleanType():
          result.push({ name: e.name, description, valueSet: 'v' });
          result.push({ name: `?${e.name}`, description });
          break;
      }
      if (getBasicUnionValues(declaration)) {
        result.push({ name: e.name, description });
      }
      if (typeText?.startsWith('Emitter')) {
        result.push({ name: `@${e.name}`, description });
      } else {
        result.push({ name: `.${e.name}`, description });
      }
    });
    const oResult = dataProvider.provideAttributes(isCustomElementTag(tag) ? 'div' : tag);
    oResult.forEach((data) => {
      const tryEvtName = data.name.replace(/^on/, '@');
      if (tryEvtName !== data.name) {
        result.push({ ...data, name: tryEvtName });
      }
    });
    return result;
  }

  provideValues(tag: string, attr: string) {
    const { elements, getProgram } = this.#ctx;
    const typeChecker = getProgram()!.getTypeChecker();
    const node = elements.get(tag);
    if (!node) return [];
    const prop = typeChecker.getTypeAtLocation(node).getProperty(getAttrName(attr).attr);
    const declaration = prop?.getDeclarations()?.at(0);
    const result = getBasicUnionValues(declaration);
    return result || [];
  }
}

export class HTMLLanguageService implements TemplateLanguageService {
  #completionsCache = new LRUCache<CompletionList>();
  #diagnosticsCache = new LRUCache<ts.Diagnostic[]>();
  #virtualHtmlCache = new LRUCache<{ vDoc: TextDocument; vHtml: HTMLDocument }>();
  #virtualCssCache = new LRUCache<{ vDoc: TextDocument; vCss: Stylesheet }>();

  #cssLanguageService: ReturnType<typeof getCSSLanguageService>;
  #htmlLanguageService: ReturnType<typeof getHTMLanguageService>;
  #ctx: Context;

  constructor(ctx: Context) {
    this.#ctx = ctx;
    this.#htmlLanguageService = getHTMLanguageService({
      customDataProviders: [dataProvider, new HTMLDataProvider(ctx)],
    });
    this.#cssLanguageService = getCSSLanguageService({});
  }

  #getCssDoc(context: CacheContext) {
    return this.#virtualCssCache.get(context, () => {
      const vDoc = createVirtualDocument('css', context.text);
      const vCss = this.#cssLanguageService.parseStylesheet(vDoc);
      return { vDoc, vCss };
    });
  }

  #getHtmlDoc(context: CacheContext) {
    return this.#virtualHtmlCache.get(context, () => {
      const vDoc = createVirtualDocument('html', context.text);
      const vHtml = this.#htmlLanguageService.parseHTMLDocument(vDoc);
      return { vDoc, vHtml };
    });
  }

  #getAllStyleSheet(doc: HTMLDocument) {
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

  #getEmbeddedCss(context: TemplateContext, position: ts.LineAndCharacter, doc: HTMLDocument) {
    const node = doc.findNodeAt(context.toOffset(position));
    if (node.tag !== 'style') return;
    const text = context.text.slice(node.startTagEnd, node.endTagStart);
    const { vDoc, vCss } = this.#getCssDoc({ fileName: context.fileName, text });
    const offset = context.toOffset(position) - node.startTagEnd!;
    const toPosition = (pos: Position) => context.toPosition(vDoc.offsetAt(pos) + node.startTagEnd!);
    return {
      style: vCss,
      vDoc,
      position: vDoc.positionAt(offset),
      updateRange: (range: Range) => ({
        start: toPosition(range.start),
        end: toPosition(range.end),
      }),
    };
  }

  #getCSSCompletionsAtPosition(context: TemplateContext, position: ts.LineAndCharacter, doc: HTMLDocument) {
    const css = this.#getEmbeddedCss(context, position, doc);
    if (!css) return [];

    let emmetResults: CompletionList | undefined;
    const onCssProperty = () => (emmetResults = doEmmetComplete(css.vDoc, css.position, 'css', this.#ctx.config.emmet));
    this.#cssLanguageService.setCompletionParticipants([{ onCssProperty }]);
    updateCSSTags([...this.#ctx.elements].map(([tag]) => tag));
    const completions = this.#cssLanguageService.doComplete(css.vDoc, css.position, css.style);

    completions.items.push(...(emmetResults?.items || []));
    return completions.items.map((e) => {
      const textEdit = e.textEdit && 'range' in e.textEdit && e.textEdit;
      const newTextEdit = textEdit && { newText: textEdit.newText, range: css.updateRange(textEdit.range) };
      return { ...e, textEdit: newTextEdit || e.textEdit };
    });
  }

  #getCompletionsAtPosition(context: TemplateContext, position: ts.LineAndCharacter) {
    const cached = this.#completionsCache.getCached(context, position);
    if (cached) return cached;
    const { vDoc, vHtml } = this.#getHtmlDoc(context);

    let emmetResults: CompletionList | undefined;
    const onHtmlContent = () => {
      updateTags([...this.#ctx.elements].map(([tag]) => tag));
      emmetResults = doEmmetComplete(vDoc, position, 'html', this.#ctx.config.emmet);
    };
    this.#htmlLanguageService.setCompletionParticipants([{ onHtmlContent }]);
    const completions = this.#htmlLanguageService.doComplete(vDoc, position, vHtml);

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
    const css = this.#getEmbeddedCss(context, position, doc);
    if (!css) return;
    const hover = this.#cssLanguageService.doHover(css.vDoc, css.position, css.style, {
      documentation: true,
      references: true,
    });
    if (!hover) return;
    return { ...hover, range: hover.range && css.updateRange(hover.range) };
  }

  getQuickInfoAtPosition(context: TemplateContext, position: ts.LineAndCharacter) {
    const { vDoc, vHtml } = this.#getHtmlDoc(context);
    const htmlHover = this.#htmlLanguageService.doHover(vDoc, position, vHtml, {
      documentation: true,
      references: true,
    });
    const hover = htmlHover || this.#getCSSQuickInfoAtPosition(context, position, vHtml);
    if (!hover) return;
    return translateHover(context, hover, position);
  }

  getSyntacticDiagnostics(context: TemplateContext): ts.Diagnostic[] {
    const cached = this.#diagnosticsCache.getCached(context);
    if (cached) return cached;

    const { vHtml } = this.#getHtmlDoc(context);
    const styles = this.#getAllStyleSheet(vHtml);
    const file = this.#ctx.getProgram()!.getSourceFile(context.fileName);
    const diagnostics = styles.map((node) => {
      const text = context.text.slice(node.startTagEnd, node.endTagStart);
      const { vDoc, vCss } = this.#getCssDoc({ fileName: context.fileName, text });
      const oDiagnostics = this.#cssLanguageService.doValidation(vDoc, vCss);
      return oDiagnostics.map(({ message, range }) => {
        const start = node.startTagEnd! + vDoc.offsetAt(range.start);
        const end = node.startTagEnd! + vDoc.offsetAt(range.end);
        return {
          category: context.typescript.DiagnosticCategory.Warning,
          code: 0,
          file,
          start,
          length: end - start,
          messageText: message,
        };
      });
    });
    return this.#diagnosticsCache.updateCached(context, diagnostics.flat());
  }

  getDefinitionAndBoundSpan(context: TemplateContext, position: ts.LineAndCharacter): ts.DefinitionInfoAndBoundSpan {
    // typescript-template-language-service-decorator 根据当前文档位置偏移了
    const htmlOffset = context.node.pos + 1;
    const currentOffset = context.toOffset(position);
    const { vHtml } = this.#getHtmlDoc(context);
    const node = vHtml.findNodeAt(currentOffset);
    const { text, start, length, before } = getHTMLTextAtPosition(context.text, currentOffset);
    const definitionNode = this.#ctx.elements.get(node.tag!);
    const empty = { textSpan: { start, length } };

    if (!definitionNode || node.tag === 'style' || currentOffset > node.startTagEnd! || !text) return empty;

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

    const { attr, offset } = getAttrName(text);
    if (before.length > attr.length) return empty;

    const typeChecker = this.#ctx.getProgram()!.getTypeChecker();
    const propSymbol = typeChecker.getTypeAtLocation(definitionNode).getProperty(kebabToCamelCase(attr));
    const propDeclaration = propSymbol?.getDeclarations()?.at(0);
    return {
      textSpan: { start: start + offset, length: attr.length },
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
