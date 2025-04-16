import type { TemplateContext } from '@mantou/typescript-template-language-service-decorator';
import type * as ts from 'typescript/lib/tsserverlibrary';
import * as vscode from 'vscode-languageserver-types';

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

  const escapeText = (unsafe: string) =>
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
      text: typeof text !== 'string' ? text.value : isDoc ? escapeText(text) : text,
    },
  ];
}

export function genElementDefinitionInfo(
  context: TemplateContext,
  { start, length }: ts.TextSpan,
  definitionNode: ts.ClassDeclaration | ts.InterfaceDeclaration,
): ts.DefinitionInfoAndBoundSpan {
  // typescript-template-language-service-decorator bug, 根据当前文档位置偏移了
  const htmlOffset = context.node.pos + 1;
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

export function genAttrDefinitionInfo(
  context: TemplateContext,
  { start, length }: ts.TextSpan,
  propDeclaration: ts.Declaration,
): ts.DefinitionInfoAndBoundSpan {
  // typescript-template-language-service-decorator 根据当前文档位置偏移了
  const htmlOffset = context.node.pos + 1;
  return {
    textSpan: { start, length },
    definitions: [
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

export function genCurrentCtxDefinitionInfo(
  context: TemplateContext,
  { start, length }: ts.TextSpan,
  definitionTextSpan: ts.TextSpan,
): ts.DefinitionInfoAndBoundSpan {
  return {
    textSpan: { start, length },
    definitions: [
      {
        containerName: 'Attribute',
        containerKind: context.typescript.ScriptElementKind.unknown,
        name: context.text.slice(start, start + length),
        kind: context.typescript.ScriptElementKind.memberVariableElement,
        fileName: context.fileName,
        textSpan: definitionTextSpan,
      },
    ],
  };
}
