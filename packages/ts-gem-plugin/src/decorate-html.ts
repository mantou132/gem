import { camelToKebabCase, kebabToCamelCase } from '@mantou/gem/lib/utils';
import type { TemplateContext, TemplateLanguageService } from '@mantou/typescript-template-language-service-decorator';
import { updateTags as updateCSSTags } from '@mantou/vscode-css-languageservice';
import { doComplete as doEmmetComplete, updateTags } from '@mantou/vscode-emmet-helper';
import type { CompletionList, HTMLDocument, Position, Range } from '@mantou/vscode-html-languageservice';
import type * as ts from 'typescript/lib/tsserverlibrary';

import { LRUCache } from './cache';
import { DiagnosticCode, NAME } from './constants';
import type { Context } from './context';
import {
  genAttrDefinitionInfo,
  genCurrentCtxDefinitionInfo,
  genDefaultCompletionEntryDetails,
  genElementDefinitionInfo,
  translateCompletionItemsToCompletionEntryDetails,
  translateCompletionItemsToCompletionInfo,
  translateHover,
} from './translates';
import { forEachNode, getAstNodeAtPosition, getAttrName, getHTMLTextAtPosition, isCustomElementTag } from './utils';

export class HTMLLanguageService implements TemplateLanguageService {
  #completionsCache = new LRUCache<CompletionList>({ max: 1 });
  #diagnosticsCache = new LRUCache<ts.Diagnostic[]>();
  #ctx: Context;

  constructor(ctx: Context) {
    this.#ctx = ctx;
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
    const { vDoc, vCss } = this.#ctx.getCssDoc(text);
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
    this.#ctx.cssLanguageService.setCompletionParticipants([{ onCssProperty }]);
    updateCSSTags([...this.#ctx.elements].map(([tag]) => tag));
    const completions = this.#ctx.cssLanguageService.doComplete(css.vDoc, css.position, css.style);

    completions.items.push(...(emmetResults?.items || []));
    return completions.items.map((e) => {
      const textEdit = e.textEdit && 'range' in e.textEdit && e.textEdit;
      const newTextEdit = textEdit && { newText: textEdit.newText, range: css.updateRange(textEdit.range) };
      return { ...e, textEdit: newTextEdit || e.textEdit };
    });
  }

  #getCompletionsAtPosition(context: TemplateContext, position: ts.LineAndCharacter) {
    return this.#completionsCache.get(context, position, () => {
      const { vDoc, vHtml } = this.#ctx.getHtmlDoc(context.text);

      let emmetResults: CompletionList | undefined;
      const onHtmlContent = () => {
        updateTags([...this.#ctx.elements].map(([tag]) => tag));
        emmetResults = doEmmetComplete(vDoc, position, 'html', this.#ctx.config.emmet);
      };
      this.#ctx.htmlLanguageService.setCompletionParticipants([{ onHtmlContent }]);
      const completions = this.#ctx.htmlLanguageService.doComplete(vDoc, position, vHtml);

      completions.items.push(...(emmetResults?.items || []));
      completions.items.push(...this.#getCSSCompletionsAtPosition(context, position, vHtml));

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

  #getCSSQuickInfoAtPosition(context: TemplateContext, position: ts.LineAndCharacter, doc: HTMLDocument) {
    const css = this.#getEmbeddedCss(context, position, doc);
    if (!css) return;
    const hover = this.#ctx.cssLanguageService.doHover(css.vDoc, css.position, css.style, {
      documentation: true,
      references: true,
    });
    if (!hover) return;
    return { ...hover, range: hover.range && css.updateRange(hover.range) };
  }

  getQuickInfoAtPosition(context: TemplateContext, position: ts.LineAndCharacter) {
    const { vDoc, vHtml } = this.#ctx.getHtmlDoc(context.text);
    const htmlHover = this.#ctx.htmlLanguageService.doHover(vDoc, position, vHtml, {
      documentation: true,
      references: true,
    });
    const hover = htmlHover || this.#getCSSQuickInfoAtPosition(context, position, vHtml);
    if (!hover) return;
    return translateHover(context, hover, position);
  }

  #getCssSyntacticDiagnostics(context: TemplateContext) {
    return this.#diagnosticsCache.get(context, undefined, () => {
      const { vHtml } = this.#ctx.getHtmlDoc(context.text);
      const file = this.#ctx.getProgram().getSourceFile(context.fileName);
      const styles = this.#getAllStyleSheet(vHtml);
      const diagnostics: ts.Diagnostic[] = [];
      styles.forEach((node) => {
        const text = context.text.slice(node.startTagEnd, node.endTagStart);
        const { vDoc, vCss } = this.#ctx.getCssDoc(text);
        this.#ctx.cssLanguageService.doValidation(vDoc, vCss).forEach(({ message, range }) => {
          const start = node.startTagEnd! + vDoc.offsetAt(range.start);
          const end = node.startTagEnd! + vDoc.offsetAt(range.end);
          diagnostics.push({
            category: context.typescript.DiagnosticCategory.Warning,
            code: 0,
            file,
            start,
            length: end - start,
            messageText: message,
            source: NAME,
          });
        });
      });
      return diagnostics;
    });
  }

  #getHtmlSyntacticDiagnostics(context: TemplateContext) {
    const offset = context.node.getStart() + 1;
    const { vHtml } = this.#ctx.getHtmlDoc(context.text);
    const program = this.#ctx.getProgram();
    const file = program.getSourceFile(context.fileName)!;
    const typeChecker = program.getTypeChecker();
    const diagnostics: ts.Diagnostic[] = [];
    forEachNode(vHtml.roots, (node) => {
      if (!node.tag) return;

      // 检查自定义元素是否定义
      if (isCustomElementTag(node.tag) && !this.#ctx.elements.get(node.tag)) {
        diagnostics.push({
          category: context.typescript.DiagnosticCategory.Warning,
          code: DiagnosticCode.UnknownTag,
          file,
          start: node.start + 1,
          length: node.tag.length,
          messageText: `Unknown element tag '${node.tag}'`,
          source: NAME,
        });
      }

      const tagDeclaration = this.#ctx.elements.get(node.tag) || this.#ctx.builtInElements.get(node.tag);
      if (!tagDeclaration) return;

      // 检查属性类型
      for (const [attributeName, { value, start, end }] of node.attributesMap) {
        if (attributeName.startsWith('_')) continue;

        const hasValueSpan = value?.startsWith('_');
        const attrInfo = getAttrName(attributeName);
        const propType = getPropType(typeChecker, tagDeclaration, attrInfo);
        const diagnostic = {
          category: context.typescript.DiagnosticCategory.Warning,
          file,
          start: start,
          length: end - start,
          source: NAME,
          code: DiagnosticCode.PropTypeError,
          messageText: !propType
            ? `'${attributeName}' type error`
            : `'${attributeName}' not satisfied '${typeChecker.typeToString(propType)}'`,
        };

        if (
          (attributeName === 'v-else-if' || attributeName === 'v-else') &&
          !node.prev?.attributesMap.has('v-if') &&
          !node.prev?.attributesMap.has('v-else-if')
        ) {
          diagnostics.push({
            ...diagnostic,
            code: DiagnosticCode.PropSyntaxError,
            messageText: `'${attrInfo.attr}' syntax error`,
          });
        }

        if (attributeName === 'v-if' || attributeName === 'v-else-if') {
          const spanType = getSpanType(this.#ctx.ts, typeChecker, file, offset, end);
          if (!hasValueSpan || !typeChecker.isTypeAssignableTo(spanType, typeChecker.getBooleanType())) {
            diagnostics.push(diagnostic);
          }
          continue;
        }

        if (attributeName === 'v-else') {
          if (value !== null) {
            diagnostics.push(diagnostic);
          }
          continue;
        }

        if (!propType) {
          if (attrInfo.decorate !== '@') {
            // <div unknown>
            diagnostics.push({
              ...diagnostic,
              code: DiagnosticCode.UnknownProp,
              messageText: `Unknown property '${attrInfo.attr}'`,
            });
          }
          continue;
        }

        if (value === null) {
          if (attrInfo.decorate) {
            // <div ?hidden>
            diagnostics.push({
              ...diagnostic,
              code: DiagnosticCode.PropSyntaxError,
              messageText: `Consider using '${camelToKebabCase(attrInfo.attr)}'`,
            });
          } else if (propType !== typeChecker.getBooleanType()) {
            // <div class>
            diagnostics.push(diagnostic);
          }
          continue;
        }

        if (hasValueSpan) {
          const spanType = getSpanType(this.#ctx.ts, typeChecker, file, offset, end);
          switch (attrInfo.decorate) {
            case '?': {
              const boolType = getUnionType(typeChecker, [
                typeChecker.getBooleanType(),
                typeChecker.getUndefinedType(),
                typeChecker.getNullType(),
              ]);
              if (!typeChecker.isTypeAssignableTo(spanType, boolType)) {
                // <div ?hidden=${"string"}>
                diagnostics.push(diagnostic);
              }
              continue;
            }
            case '.':
            case '@':
              if (!typeChecker.isTypeAssignableTo(spanType, propType)) {
                // <div .hidden=${"string"}>
                // <div @keydown=${"string"}>
                diagnostics.push(diagnostic);
              }
              continue;
            default:
              if (
                !typeChecker.isTypeAssignableTo(spanType, propType) &&
                (!typeChecker.isTypeAssignableTo(propType, typeChecker.getStringType()) ||
                  !typeChecker.isTypeAssignableTo(spanType, typeChecker.getStringType()))
              ) {
                // <div hidden=${"string"}>
                diagnostics.push(diagnostic);
              }
              continue;
          }
        } else {
          const types = [typeChecker.getStringType(), typeChecker.getNumberType()];
          const valueLetter = value.startsWith('"') ? value.slice(1, -1) : value;
          types.push(typeChecker.getStringLiteralType(valueLetter));
          const numberValue = Number(valueLetter);
          if (!Number.isNaN(numberValue)) {
            types.push(typeChecker.getNumberLiteralType(numberValue));
          }
          if (attrInfo.decorate) {
            // <div ?hidden="">
            diagnostics.push({
              ...diagnostic,
              code: DiagnosticCode.PropSyntaxError,
              messageText: `Consider using '${camelToKebabCase(attrInfo.attr)}'`,
            });
          } else if (types.every((t) => !typeChecker.isTypeAssignableTo(t, propType))) {
            // <div innerText="">
            diagnostics.push(diagnostic);
          }
        }
      }
    });
    return diagnostics;
  }

  getSyntacticDiagnostics(context: TemplateContext): ts.Diagnostic[] {
    this.#ctx.initElements();
    return [...this.#getCssSyntacticDiagnostics(context), ...this.#getHtmlSyntacticDiagnostics(context)];
  }

  getDefinitionAndBoundSpan(context: TemplateContext, position: ts.LineAndCharacter): ts.DefinitionInfoAndBoundSpan {
    const currentOffset = context.toOffset(position);
    const { vHtml } = this.#ctx.getHtmlDoc(context.text);
    const node = vHtml.findNodeAt(currentOffset);
    const { text, start, length, before } = getHTMLTextAtPosition(context.text, currentOffset);
    const empty = { textSpan: { start, length } };

    if (node.tag === 'style' && currentOffset > node.startTagEnd!) {
      const { style, vDoc, position: pos } = this.#getEmbeddedCss(context, position, vHtml)!;
      const cssNode = style.findChildAtOffset(vDoc.offsetAt(pos), true);
      if (!cssNode) return empty;
      const ident = vDoc.getText().slice(cssNode.offset, cssNode.end);
      const definitionNode = this.#ctx.elements.get(ident);
      if (!definitionNode) return empty;
      return genElementDefinitionInfo(
        context,
        { start: cssNode.offset + node.startTagEnd!, length: cssNode.length },
        definitionNode,
      );
    }

    const definitionNode = this.#ctx.elements.get(node.tag!) || this.#ctx.builtInElements.get(node.tag!);

    if (!definitionNode || currentOffset > node.startTagEnd! || !text) return empty;

    if (text === node.tag) {
      return genElementDefinitionInfo(context, { start, length }, definitionNode);
    }

    const { attr, offset } = getAttrName(text);
    if (before.length > attr.length) return empty;

    if (attr === 'v-else' || attr === 'v-else-if') {
      const ifAttr = node.prev?.attributesMap.get('v-if') || node.prev?.attributesMap.get('v-else-if');
      if (!ifAttr) return empty;
      return genCurrentCtxDefinitionInfo(
        context,
        { start: start + offset, length: attr.length },
        { start: ifAttr.start, length: ifAttr.end - ifAttr.start },
      );
    }

    const typeChecker = this.#ctx.getProgram().getTypeChecker();
    const propSymbol = typeChecker.getTypeAtLocation(definitionNode).getProperty(kebabToCamelCase(attr));
    const propDeclaration = propSymbol?.getDeclarations()?.at(0);
    if (!propDeclaration) return empty;
    return genAttrDefinitionInfo(context, { start: start + offset, length: attr.length }, propDeclaration);
  }
}

function getSpanExpression(typescript: typeof ts, file: ts.SourceFile, pos: number) {
  let node = getAstNodeAtPosition(typescript, file, pos)!;
  while (!typescript.isTemplateSpan(node)) {
    node = node.parent;
    if (!node) return;
  }
  return node.expression;
}

function getSpanType(
  typescript: typeof ts,
  typeChecker: ts.TypeChecker,
  file: ts.SourceFile,
  htmlOffset: number,
  attrNameEnd: number,
) {
  const valueOffset = attrNameEnd + htmlOffset + 3;
  const spanExp = getSpanExpression(typescript, file, valueOffset)!;
  return typeChecker.getTypeAtLocation(spanExp);
}

function getPropType(
  typeChecker: ts.TypeChecker,
  tagClassDeclaration: ts.ClassDeclaration | ts.InterfaceDeclaration,
  attrInfo: ReturnType<typeof getAttrName>,
) {
  const classType = typeChecker.getTypeAtLocation(tagClassDeclaration);
  if (attrInfo.attr.startsWith('data-')) {
    return typeChecker.getStringType();
  }
  const propName = kebabToCamelCase(attrInfo.attr);
  switch (propName) {
    case 'class':
    case 'style':
    case 'part':
    case 'exportparts':
    case 'xmlns':
    case 'viewBox':
      return typeChecker.getStringType();
    case 'tabindex':
      return typeChecker.getNumberType();
    case 'ariaDisabled':
    case 'ariaChecked':
    case 'ariaHidden':
      return getUnionType(typeChecker, [
        typeChecker.getStringType(),
        typeChecker.getBooleanType(),
        typeChecker.getUndefinedType(),
      ]);
    default: {
      const isEvent = attrInfo.decorate === '@';
      const propSymbol = classType.getProperty(propName);
      const propType = propSymbol && typeChecker.getTypeOfSymbol(propSymbol);
      if (!isEvent) return propType;
      const eventHandleType = getEmitterHandleType(typeChecker, classType, propType);
      return getUnionType(typeChecker, [eventHandleType, typeChecker.getUndefinedType()]);
    }
  }
}

function getEmitterHandleType(typeChecker: ts.TypeChecker, classType: ts.Type, propType?: ts.Type) {
  const handleSymbol = propType?.getProperty('handler');
  if (handleSymbol) return typeChecker.getTypeOfSymbol(handleSymbol);

  const addEventListenerSymbol = classType.getProperty('addEventListener');
  if (!addEventListenerSymbol) return typeChecker.getAnyType();

  const addEventListenerDecls = addEventListenerSymbol.declarations as ts.MethodSignature[];
  const addEventListenerDecl = addEventListenerDecls.find((e) => !e.typeParameters);
  const listenerDecl = addEventListenerDecl!.parameters.at(1);
  if (!listenerDecl) return typeChecker.getAnyType();

  return typeChecker.getTypeAtLocation(listenerDecl);
}

function getUnionType(typeChecker: ts.TypeChecker, types: ts.Type[]): ts.Type {
  if ('getUnionType' in typeChecker) {
    return (typeChecker as any).getUnionType(types);
  }
  return types.at(0)!;
}
