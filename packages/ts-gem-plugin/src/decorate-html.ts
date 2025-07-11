import { camelToKebabCase, kebabToCamelCase } from '@mantou/gem/lib/utils';
import type { TemplateContext, TemplateLanguageService } from '@mantou/typescript-template-language-service-decorator';
import { NodeType, updateTags as updateCSSTags } from '@mantou/vscode-css-languageservice';
import { doComplete as doEmmetComplete } from '@mantou/vscode-emmet-helper';
import type { CompletionList, HTMLDocument, Position, Range } from '@mantou/vscode-html-languageservice';
import { isNotNullish } from 'duoyun-ui/lib/types';
import type * as ts from 'typescript/lib/tsserverlibrary';

import { LRUCache } from './cache';
import { DiagnosticCode, HTML_SUBSTITUTION_CHAR, NAME } from './constants';
import type { Context } from './context';
import {
  genAttrDefinitionInfo,
  genCurrentCtxCssDefinitionInfo,
  genCurrentCtxDefinitionInfo,
  genDefaultCompletionEntryDetails,
  genElementDefinitionInfo,
  translateCompletionItemsToCompletionEntryDetails,
  translateCompletionItemsToCompletionInfo,
  translateFoldingRange,
  translateHover,
} from './translates';
import {
  forEachNode,
  getAstNodeAtPosition,
  getAttrName,
  getCurrentElementDecl,
  getIdentAtPosition,
  isCustomElementTag,
} from './utils';

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
      const onHtmlContent = () => (emmetResults = doEmmetComplete(vDoc, position, 'html', this.#ctx.config.emmet));
      this.#ctx.htmlLanguageService.setCompletionParticipants([{ onHtmlContent }]);
      this.#ctx.prepareComplete(context.node);
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

  #getHtmlSemanticDiagnostics(context: TemplateContext) {
    const offset = context.node.getStart() + 1;
    const templateTag = (context.node.parent as ts.TaggedTemplateExpression).tag?.getText();
    const { vHtml } = this.#ctx.getHtmlDoc(context.text);
    const program = this.#ctx.getProgram();
    const file = program.getSourceFile(context.fileName)!;
    const typeChecker = program.getTypeChecker();
    const diagnostics: ts.Diagnostic[] = [];
    const baseDiagnostic = { file, source: NAME };
    forEachNode(vHtml.roots, (node) => {
      if (!node.tag) return;

      const customElementTagDecl = this.#ctx.elements.get(node.tag);
      const builtInElementTagDecl = this.#ctx.builtInElements.get(node.tag);
      const baseTagDiagnostic = { ...baseDiagnostic, start: node.start + 1, length: node.tag.length };

      if (this.#ctx.config.strict && templateTag !== 'raw' && node.tag === 'style') {
        diagnostics.push({
          ...baseTagDiagnostic,
          category: context.typescript.DiagnosticCategory.Warning,
          code: DiagnosticCode.NoStyleTag,
          messageText: `Use 'adoptedStyle' or 'createDecoratorTheme' instead of the style tag`,
        });
      }

      // 检查自定义元素是否定义
      if (isCustomElementTag(node.tag) && !customElementTagDecl) {
        diagnostics.push({
          ...baseTagDiagnostic,
          category: context.typescript.DiagnosticCategory.Warning,
          code: DiagnosticCode.UnknownTag,
          messageText: `Unknown element tag '${node.tag}'`,
        });
      }

      const tagDeclaration = customElementTagDecl || builtInElementTagDecl;
      if (!tagDeclaration) return;
      const classType = typeChecker.getTypeAtLocation(tagDeclaration);
      const isSVG = builtInElementTagDecl?.name.getText().startsWith('SVG');

      // 检查元素是否弃用
      if (tagDeclaration.name && isDeprecate(typeChecker.getSymbolAtLocation(tagDeclaration.name))) {
        [node.start + 1, node.endTagStart && node.endTagStart + 2].filter(isNotNullish).forEach((tagStart) => {
          diagnostics.push({
            ...baseTagDiagnostic,
            start: tagStart,
            category: context.typescript.DiagnosticCategory.Suggestion,
            code: DiagnosticCode.Deprecated,
            messageText: `Deprecated tag '${node.tag}'`,
            reportsDeprecated: 'true',
          });
        });
      }

      // 检查属性类型
      for (const [attributeName, { value, start, end }] of node.attributesMap) {
        if (attributeName.startsWith(HTML_SUBSTITUTION_CHAR)) continue;

        const hasValueSpan = value?.startsWith(HTML_SUBSTITUTION_CHAR);
        const attrInfo = getAttrName(attributeName);
        const propName = getPropName(attrInfo, !!builtInElementTagDecl);
        const propType = getPropType(typeChecker, classType, propName, attrInfo.decorate === '@');
        const attrBaseDiagnostic = { ...baseDiagnostic, start: start, length: end - start };

        // 检查属性是否弃用
        if (isDeprecate(classType.getProperty(propName))) {
          diagnostics.push({
            ...attrBaseDiagnostic,
            category: context.typescript.DiagnosticCategory.Suggestion,
            code: DiagnosticCode.Deprecated,
            messageText: `Deprecated prop '${attrInfo.attr}'`,
            reportsDeprecated: 'true',
          });
        }

        const diagnostic = {
          ...attrBaseDiagnostic,
          category: context.typescript.DiagnosticCategory.Warning,
          code: DiagnosticCode.PropTypeError,
          messageText: !propType
            ? `'${attributeName}' type error`
            : `'${attributeName}' not satisfied '${typeChecker.typeToString(propType)}'`,
        };

        if (templateTag === 'raw') {
          if (attrInfo.decorate) {
            diagnostics.push({
              ...diagnostic,
              code: DiagnosticCode.PropSyntaxError,
              messageText: `Raw HTML templates only support attributes`,
            });
            continue;
          }
          if (hasValueSpan) {
            diagnostics.push({
              ...diagnostic,
              code: DiagnosticCode.PropSyntaxError,
              messageText: `Please wrap the raw html template attribute value with "" to avoid parsing errors when the value is an empty string`,
            });
            continue;
          }
        }

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
          continue;
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

        if (
          // SVG 大小写敏感
          !isSVG &&
          attrInfo.decorate === '' &&
          attributeName !== camelToKebabCase(attrInfo.attr)
        ) {
          // <my-element myProp="xx">
          diagnostics.push({
            ...diagnostic,
            code: DiagnosticCode.AttrFormatError,
            messageText: `Consider using '${customElementTagDecl ? camelToKebabCase(attrInfo.attr) : attrInfo.attr.toLowerCase()}'`,
          });
          continue;
        }

        if (!propType) {
          if (
            // SVG 元素有很多 css 属性，所以不检查
            !isSVG &&
            attrInfo.decorate !== '@'
          ) {
            // <div unknown>
            diagnostics.push({
              ...diagnostic,
              code: DiagnosticCode.UnknownProp,
              messageText: `Unknown property '${attrInfo.attr}'`,
            });
          }
          continue;
        }

        if (
          globalEnumeratedBooleanAttr.has(attrInfo.attr) &&
          // <div ?draggable=${xx}>
          (attrInfo.decorate === '?' ||
            // <div draggable>
            value === null)
        ) {
          diagnostics.push({
            ...diagnostic,
            code: DiagnosticCode.PropSyntaxError,
            messageText: `Consider using '${camelToKebabCase(attrInfo.attr)}', must has value`,
          });
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
            default: {
              const nullablePropType = getUnionType(typeChecker, [
                propType,
                typeChecker.getNullType(),
                typeChecker.getUndefinedType(),
              ]);
              if (
                !typeChecker.isTypeAssignableTo(spanType, nullablePropType) &&
                (!typeChecker.isTypeAssignableTo(propType, typeChecker.getStringType()) ||
                  !typeChecker.isTypeAssignableTo(spanType, typeChecker.getStringType()))
              ) {
                // <div hidden=${"string"}>
                diagnostics.push(diagnostic);
              }
              continue;
            }
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
          } else if (globalEnumeratedBooleanAttr.has(attrInfo.attr)) {
            const values = ['true', 'false', ...globalEnumeratedBooleanAttr.get(attrInfo.attr)!];
            if (!values.includes(valueLetter)) {
              // <div draggable="string">
              diagnostics.push({
                ...diagnostic,
                code: DiagnosticCode.PropTypeError,
                messageText: `Must be ${values.join(', ')}`,
              });
            }
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
    return this.#getCssSyntacticDiagnostics(context);
  }

  getSemanticDiagnostics(context: TemplateContext): ts.Diagnostic[] {
    return this.#getHtmlSemanticDiagnostics(context);
  }

  getDefinitionAndBoundSpan(context: TemplateContext, position: ts.LineAndCharacter): ts.DefinitionInfoAndBoundSpan {
    const typeChecker = this.#ctx.getProgram().getTypeChecker();
    const currentOffset = context.toOffset(position);
    const { vHtml } = this.#ctx.getHtmlDoc(context.text);
    const { node, attrStart, attrEnd, attrName, attrValue } = getHTMLNodeAtPosition(vHtml, currentOffset);

    const empty = { textSpan: { start: 0, length: 0 } };
    const notInStartTag = currentOffset > node.startTagEnd!;
    const startTagNameStart = node.start + 1;
    if (!node.tag) return empty;

    if (node.tag === 'style' && notInStartTag) {
      const { style, vDoc, position: pos } = this.#getEmbeddedCss(context, position, vHtml)!;
      const cssNode = style.findChildAtOffset(vDoc.offsetAt(pos), true);
      if (!cssNode || cssNode.parent?.type !== NodeType.ElementNameSelector) return empty;
      const definitionNode = this.#ctx.elements.get(cssNode.getText());
      if (!definitionNode) return empty;
      return genElementDefinitionInfo(
        context,
        { start: cssNode.offset + node.startTagEnd!, length: cssNode.length },
        definitionNode,
      );
      // 忽略内联样式: go to definition
    }

    const definitionNode = this.#ctx.elements.get(node.tag) || this.#ctx.builtInElements.get(node.tag);
    if (!definitionNode || notInStartTag) return empty;

    if (currentOffset < startTagNameStart + node.tag.length) {
      return genElementDefinitionInfo(context, { start: startTagNameStart, length: node.tag.length }, definitionNode);
    }

    if (!attrName) return empty;

    const { attr, offset } = getAttrName(attrName);

    if (attr === 'class' || attr === 'id') {
      if (!attrValue) return empty;
      const currentAttrValue = getIdentAtPosition(attrValue, currentOffset - (attrEnd + 1));
      const currentElementDecl = getCurrentElementDecl(context.typescript, context.node);
      if (!currentAttrValue || !currentElementDecl) return empty;
      return genCurrentCtxCssDefinitionInfo(
        context,
        currentAttrValue.text,
        attrEnd + 1 + currentAttrValue.start,
        this.#ctx
          .getAllCss(currentElementDecl)
          .flatMap(({ classIdNodeMap, templateContext }) => {
            const nodes = classIdNodeMap.get(attr === 'id' ? `#${currentAttrValue.text}` : currentAttrValue.text);
            return { ctx: templateContext, nodes: nodes || [], offset: 0 };
          })
          .filter(isNotNullish),
      );
    }

    if (currentOffset > attrEnd) return empty;

    if (attr === 'v-else' || attr === 'v-else-if') {
      const ifAttr = node.prev?.attributesMap.get('v-if') || node.prev?.attributesMap.get('v-else-if');
      if (!ifAttr) return empty;
      return genCurrentCtxDefinitionInfo(
        context,
        { start: attrStart + offset, length: attr.length },
        { start: ifAttr.start, length: ifAttr.end - ifAttr.start },
      );
    }

    const propSymbol = typeChecker.getTypeAtLocation(definitionNode).getProperty(kebabToCamelCase(attr));
    const propDeclaration = propSymbol?.getDeclarations()?.at(0);
    if (!propDeclaration) return empty;
    return genAttrDefinitionInfo(context, { start: attrStart + offset, length: attr.length }, propDeclaration);
  }

  // 不知道如何起作用的，没有被调用，但不加就没有 HTML 折叠了
  // 所以也忽略了 HTML 里面的内联样式折叠
  getOutliningSpans(context: TemplateContext): ts.OutliningSpan[] {
    const { vDoc } = this.#ctx.getHtmlDoc(context.text);
    const ranges = this.#ctx.htmlLanguageService.getFoldingRanges(vDoc);
    return ranges.map((range) => translateFoldingRange(context, range));
  }

  getJsxClosingTagAtPosition(
    context: TemplateContext,
    position: ts.LineAndCharacter,
  ): ts.JsxClosingTagInfo | undefined {
    const currentOffset = context.toOffset(position);
    const { vHtml } = this.#ctx.getHtmlDoc(context.text);
    const node = vHtml.findNodeAt(currentOffset);
    if (!node.tag || !node.startTagEnd || voidElementTags.has(node.tag)) return;
    if (!node.endTagStart) return { newText: `</${node.tag}>` };
  }

  getDocumentHighlights(context: TemplateContext, position: ts.LineAndCharacter): ts.DocumentHighlights[] | undefined {
    const { vDoc, vHtml } = this.#ctx.getHtmlDoc(context.text);
    const docHighlights = this.#ctx.htmlLanguageService.findDocumentHighlights(vDoc, position, vHtml);
    return [
      {
        fileName: context.fileName,
        highlightSpans: docHighlights.map(({ range }) => {
          const start = vDoc.offsetAt(range.start);
          const end = vDoc.offsetAt(range.end);
          return { textSpan: { start, length: end - start }, kind: this.#ctx.ts.HighlightSpanKind.definition };
        }),
      },
    ];
  }

  getCodeFixesAtPosition(
    context: TemplateContext,
    start: number,
    end: number,
    errorCodes: number[],
  ): (ts.CodeAction | ts.CodeFixAction)[] {
    const result: (ts.CodeAction | ts.CodeFixAction)[] = [];

    if (errorCodes.includes(DiagnosticCode.AttrFormatError)) {
      const { vHtml } = this.#ctx.getHtmlDoc(context.text);
      const node = vHtml.findNodeAt(start);
      const isBuiltInTag = !!this.#ctx.builtInElements.get(node.tag!);
      const attr = context.text.slice(start, end);
      const targetAttr = isBuiltInTag ? attr.toLowerCase() : camelToKebabCase(attr);
      const textChanges = [{ span: { start, length: end - start }, newText: targetAttr }];
      result.push({
        fixName: context.fileName,
        description: `Convert attribute to '${targetAttr}'`,
        changes: [{ fileName: context.fileName, textChanges }],
      });
    }

    return result;
  }
}

// https://developer.mozilla.org/en-US/docs/Glossary/Void_element
const voidElementTags = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

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
  const valueOffset = attrNameEnd + htmlOffset + 4;
  const spanExp = getSpanExpression(typescript, file, valueOffset)!;
  return typeChecker.getTypeAtLocation(spanExp);
}

const buildInElementNoGlobalAttrPropMap = new Map([
  ['crossorigin', 'crossOrigin'],
  ['rowspan', 'rowSpan'],
  ['colspan', 'colSpan'],
  // <input> list: string
  ['list', 'ariaLabelledby'],
]);

const globalAttrPropMap = new Map([['contenteditable', 'contentEditable']]);

const globalEnumeratedBooleanAttr = new Map([
  ['draggable', []],
  ['spellcheck', []],
  ['contenteditable', ['plaintext-only']],
]);

function getPropName(attrInfo: ReturnType<typeof getAttrName>, isNativeTag: boolean) {
  if (attrInfo.attr.startsWith('data-')) {
    return attrInfo.attr;
  }
  return (
    globalAttrPropMap.get(attrInfo.attr) ||
    (isNativeTag
      ? buildInElementNoGlobalAttrPropMap.get(attrInfo.attr) || kebabToCamelCase(attrInfo.attr)
      : kebabToCamelCase(attrInfo.attr))
  );
}

function getPropType(typeChecker: ts.TypeChecker, classType: ts.Type, propName: string, isEvent: boolean) {
  if (propName.startsWith('data-')) {
    return typeChecker.getStringType();
  }
  switch (propName) {
    case 'class':
    case 'style':
    case 'part':
    case 'exportparts':
    case 'accesskey':
    case 'xmlns':
    case 'viewBox':
    case 'ariaLabelledby':
      return typeChecker.getStringType();
    case 'tabindex':
      return typeChecker.getNumberType();
    case 'ariaAtomic':
    case 'ariaBusy':
    case 'ariaChecked':
    case 'ariaDisabled':
    case 'ariaExpanded':
    case 'ariaGrabbed':
    case 'ariaHidden':
    case 'ariaModal':
    case 'ariaMultiline':
    case 'ariaMultiselectable':
    case 'ariaReadonly':
    case 'ariaRequired':
    case 'ariaPressed':
    case 'ariaSelected':
      return getUnionType(typeChecker, [
        typeChecker.getStringType(),
        typeChecker.getBooleanType(),
        typeChecker.getUndefinedType(),
      ]);
    default: {
      const propSymbol = classType.getProperty(propName);
      const propType = propSymbol && typeChecker.getTypeOfSymbol(propSymbol);
      if (!isEvent) return propType;
      const eventHandleType = getEmitterHandleType(typeChecker, classType, propType);
      return getUnionType(typeChecker, [eventHandleType, typeChecker.getUndefinedType()]);
    }
  }
}

function isDeprecate(symbol?: ts.Symbol) {
  if (!symbol) return false;
  const tags = symbol.getJsDocTags();
  return tags.some(({ name }) => name === 'deprecated');
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

function getHTMLNodeAtPosition(vHtml: HTMLDocument, offset: number) {
  const node = vHtml.findNodeAt(offset);
  const attr = node.attributesMap.entries().find(([_, n]) => {
    return offset > n.start && offset < n.end + 1 + (n.value?.length || 0);
  });
  return {
    node,
    attrName: attr?.[0] ?? '',
    attrValue: attr?.[1].value ?? '',
    attrStart: attr?.[1].start ?? 0,
    attrEnd: attr?.[1].end ?? 0,
  };
}
