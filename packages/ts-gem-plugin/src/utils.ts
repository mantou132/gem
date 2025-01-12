import type * as ts from 'typescript/lib/tsserverlibrary';
import * as vscode from 'vscode-languageserver-types';
import { TextDocument } from 'vscode-languageserver-textdocument';
import type { TemplateContext } from '@mantou/typescript-template-language-service-decorator';

export function isCustomElement(tag: string) {
  return tag.includes('-');
}

export function isDepElement(node: ts.Node) {
  return node.getSourceFile().fileName.includes('/node_modules/');
}

const openTagReg = /(?<prefix><)(?<tag>\w+-\w+)\s+/g;
export function forEachTag(
  typescript: typeof ts,
  containerNode: ts.Node,
  fn: (tags: { tag: string; length: number; start: number }) => void,
) {
  const list = [containerNode];
  while (true) {
    const currentNode = list.pop();
    if (!currentNode) return;
    typescript.forEachChild(currentNode, (node) => {
      list.push(node);
      if (
        typescript.isTemplateHead(node) ||
        typescript.isTemplateMiddle(node) ||
        typescript.isTemplateTail(node) ||
        typescript.isNoSubstitutionTemplateLiteral(node)
      ) {
        [...node.text.matchAll(openTagReg)].forEach((e) => {
          const { prefix = '', tag } = e.groups!;
          const start = node.getStart() + 1 + prefix.length + e.index;
          fn({ tag, length: tag.length, start });
        });
      }
    });
  }
}

export function getHTMLTextAtPosition(text: string, offset: number) {
  const before =
    text
      .slice(0, offset)
      .match(/[^ \n<>]+$/)
      ?.at(0) || '';
  const after =
    text
      .slice(offset)
      .match(/^[^ \n<>]+/)
      ?.at(0) || '';
  const str = before + after;
  return {
    text: str,
    start: offset - before.length,
    length: str.length,
  };
}

const attrMap: Record<string, 'property' | 'boolean' | 'event'> = {
  '.': 'property',
  '?': 'boolean',
  '@': 'event',
};
export function getAttrName(text: string) {
  const attr = text.split('=').at(0)!;
  const char = attr.at(0)!;
  if (char in attrMap) {
    return { attr: attr.slice(1), type: attrMap[char] };
  }
  return { attr };
}

export function getCustomElementTag(typescript: typeof ts, node: ts.Node, isDep = isDepElement(node)) {
  if (!typescript.isClassDeclaration(node)) return;

  for (const modifier of node.modifiers || []) {
    if (
      typescript.isDecorator(modifier) &&
      typescript.isCallExpression(modifier.expression) &&
      modifier.expression.expression.getText() === 'customElement'
    ) {
      const arg = modifier.expression.arguments.at(0);
      if (arg && typescript.isStringLiteral(arg)) {
        return arg.text;
      }
    }
  }

  // 只有声明文件
  if (isDep && node.name && typescript.isIdentifier(node.name)) {
    const name = node.name.text;
    if (name.endsWith('Element')) {
      return name;
    }
  }
}

export function getDocComment(typescript: typeof ts, declaration: ts.Node) {
  const fullText = declaration.getSourceFile().getFullText();
  const commentRanges = typescript.getLeadingCommentRanges(fullText, declaration.getFullStart());
  const commentStrings = commentRanges
    ?.filter(({ kind }) => kind === typescript.SyntaxKind.MultiLineCommentTrivia)
    .map(({ pos, end }) => fullText.slice(pos, end));
  return commentStrings?.join('\n');
}

export function getAstNodeAtPosition(typescript: typeof ts, node: ts.Node, pos: number) {
  if (node.pos > pos || node.end <= pos) return;
  while (node.kind >= typescript.SyntaxKind.FirstNode) {
    const nested = typescript.forEachChild(node, (child) => (child.pos <= pos && child.end > pos ? child : undefined));
    if (nested === undefined) break;
    node = nested;
  }
  return node;
}

const marker = Symbol();
/**只调用一次回调函数 */
export function decorate<T>(origin: T, cb: (o: T) => T): T {
  if ((origin as any)[marker]) return origin;
  const result = cb(origin);
  (result as any)[marker] = true;
  return result;
}

export function createVirtualDocument(languageId: string, content: string) {
  return TextDocument.create(`embedded://document.${languageId}`, languageId, 1, content);
}

export function getSubstitution(templateString: string, start: number, end: number) {
  return templateString.slice(start, end).replaceAll(/[^\n]/g, '_');
}

export function isValidCSSTemplate(
  typescript: typeof ts,
  node: ts.NoSubstitutionTemplateLiteral | ts.TaggedTemplateExpression | ts.TemplateExpression,
  callName: string,
) {
  switch (node.kind) {
    case typescript.SyntaxKind.NoSubstitutionTemplateLiteral:
    case typescript.SyntaxKind.TemplateExpression:
      const parent = node.parent;
      if (typescript.isCallExpression(parent) && parent.expression.getText() === callName) {
        return true;
      }
      if (typescript.isPropertyAssignment(parent)) {
        const call = parent.parent.parent;
        if (typescript.isCallExpression(call) && call.expression.getText() === callName) {
          return true;
        }
      }
      return false;
    default:
      return false;
  }
}

export function translateCompletionItemsToCompletionInfo(
  context: TemplateContext,
  items: vscode.CompletionList,
): ts.CompletionInfo {
  return {
    defaultCommitCharacters: [],
    isGlobalCompletion: false,
    isMemberCompletion: false,
    isNewIdentifierLocation: false,
    entries: items.items.map((x) => translateCompletionEntry(context, x)),
  };
}

function translateCompletionEntry(context: TemplateContext, vsItem: vscode.CompletionItem): ts.CompletionEntry {
  const entry: ts.CompletionEntry = {
    name: vsItem.label,
    kind: translationCompletionItemKind(context, vsItem.kind),
    sortText: '0',
    filterText: vsItem.label,
    labelDetails: { description: vsItem.detail },
  };

  if (vsItem.textEdit) {
    entry.isSnippet = vsItem.insertTextFormat === vscode.InsertTextFormat.Snippet || undefined;
    entry.insertText = vsItem.textEdit.newText;
    entry.replacementSpan = 'range' in vsItem.textEdit ? toTsSpan(context, vsItem.textEdit.range) : undefined;
  }

  return entry;
}

function translationCompletionItemKind(context: TemplateContext, kind?: vscode.CompletionItemKind) {
  const typescript = context.typescript;
  switch (kind) {
    case vscode.CompletionItemKind.Method:
      return typescript.ScriptElementKind.memberFunctionElement;
    case vscode.CompletionItemKind.Function:
      return typescript.ScriptElementKind.functionElement;
    case vscode.CompletionItemKind.Constructor:
      return typescript.ScriptElementKind.constructorImplementationElement;
    case vscode.CompletionItemKind.Field:
    case vscode.CompletionItemKind.Variable:
      return typescript.ScriptElementKind.variableElement;
    case vscode.CompletionItemKind.Class:
      return typescript.ScriptElementKind.classElement;
    case vscode.CompletionItemKind.Interface:
      return typescript.ScriptElementKind.interfaceElement;
    case vscode.CompletionItemKind.Module:
      return typescript.ScriptElementKind.moduleElement;
    case vscode.CompletionItemKind.Property:
      return typescript.ScriptElementKind.memberVariableElement;
    case vscode.CompletionItemKind.Unit:
    case vscode.CompletionItemKind.Value:
      return typescript.ScriptElementKind.constElement;
    case vscode.CompletionItemKind.Enum:
      return typescript.ScriptElementKind.enumElement;
    case vscode.CompletionItemKind.Keyword:
      return typescript.ScriptElementKind.keyword;
    case vscode.CompletionItemKind.Color:
      return typescript.ScriptElementKind.constElement;
    case vscode.CompletionItemKind.Reference:
      return typescript.ScriptElementKind.alias;
    case vscode.CompletionItemKind.File:
      return typescript.ScriptElementKind.moduleElement;
    case vscode.CompletionItemKind.Snippet:
    case vscode.CompletionItemKind.Text:
    default:
      return typescript.ScriptElementKind.unknown;
  }
}

function toTsSpan(context: TemplateContext, range: vscode.Range): ts.TextSpan {
  const editStart = context.toOffset(range.start);
  const editEnd = context.toOffset(range.end);

  return {
    start: editStart,
    length: editEnd - editStart,
  };
}

export function translateHover(
  context: TemplateContext,
  hover: vscode.Hover,
  position: ts.LineAndCharacter,
  offset = 0,
): ts.QuickInfo {
  const typescript = context.typescript;
  const header: ts.SymbolDisplayPart[] = [];
  const docs: ts.SymbolDisplayPart[] = [];
  const convertPart = (hoverContents: typeof hover.contents) => {
    if (typeof hoverContents === 'string') {
      docs.push({ kind: 'unknown', text: hoverContents });
    } else if (Array.isArray(hoverContents)) {
      hoverContents.forEach(convertPart);
    } else if ('language' in hoverContents && hoverContents.language === 'html') {
      header.push({ kind: 'unknown', text: hoverContents.value });
    } else {
      docs.push({ kind: 'unknown', text: hoverContents.value });
    }
  };
  convertPart(hover.contents);
  const start = context.toOffset(hover.range ? hover.range.start : position);
  return {
    kind: typescript.ScriptElementKind.string,
    kindModifiers: '',
    textSpan: {
      start: start - offset,
      length: hover.range ? context.toOffset(hover.range.end) - start : 1,
    },
    displayParts: header,
    documentation: docs,
    tags: [],
  };
}

export function translateCompletionItemsToCompletionEntryDetails(
  context: TemplateContext,
  item: vscode.CompletionItem,
): ts.CompletionEntryDetails {
  return {
    name: item.label,
    kindModifiers: 'declare',
    kind: item.kind ? translationCompletionItemKind(context, item.kind) : context.typescript.ScriptElementKind.unknown,
    displayParts: toDisplayParts(item.detail),
    documentation: toDisplayParts(item.documentation, true),
    tags: [],
  };
}

export function genDefaultCompletionEntryDetails(context: TemplateContext, name: string): ts.CompletionEntryDetails {
  return {
    name,
    kindModifiers: '',
    kind: context.typescript.ScriptElementKind.unknown,
    displayParts: toDisplayParts(name),
    documentation: [],
    tags: [],
  };
}

function toDisplayParts(text: string | vscode.MarkupContent | undefined, isDoc = false): ts.SymbolDisplayPart[] {
  if (!text) return [];

  const escape = (unsafe: string) =>
    unsafe
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')
      .replaceAll(' ', '&nbsp;')
      .replaceAll('\n', '  \n')
      .replaceAll('\t', '&emsp;');

  return [
    {
      kind: 'unknown',
      text: typeof text !== 'string' ? text.value : isDoc ? escape(text) : text,
    },
  ];
}
