// eslint-disable-next-line import/no-unresolved
import { Range, Position } from 'vscode';
import { TextDocument as HTMLTextDocument } from 'vscode-html-languageservice';
import type { TextLine, CompletionItem } from 'vscode';
import type { CompletionList as HtmlCompletionList } from 'vscode-html-languageservice';

export function removeSlot(text: string) {
  const v = text.replace(/\$\{[^${]*?\}/g, (str) => str.replaceAll(/[^\n]/g, ' '));
  if (v === text) return v;
  return removeSlot(v);
}

export function translateCompletionList(list: HtmlCompletionList, line: TextLine, expand?: boolean) {
  return {
    ...list,
    items: list.items.map((item) => {
      const result = item as CompletionItem;

      if (result.textEdit) {
        const range = new Range(
          new Position(line.lineNumber, result.textEdit.range.start.character),
          new Position(line.lineNumber, result.textEdit.range.end.character),
        );
        result.textEdit = undefined;
        // setting range for intellisense to show results properly
        result.range = range;
      }

      if (expand) {
        // i use this to both expand html abbreviations and auto complete tags
        result.command = {
          title: 'Emmet Expand Abbreviation',
          command: 'editor.emmet.action.expandAbbreviation',
        };
      }

      return result;
    }),
  };
}

export function matchOffset(regex: RegExp, docText: string, offset: number) {
  regex.exec('null');

  let match: RegExpExecArray | null;
  while ((match = regex.exec(docText)) !== null) {
    const [fullStr, startStr] = match;
    const start = match.index + startStr.length;
    const end = match.index + fullStr.length;
    if (offset > start && offset < end) {
      return match;
    }
  }
  return null;
}

export function createVirtualDocument(languageId: string, content: string) {
  return HTMLTextDocument.create(`embedded://document.${languageId}`, languageId, 1, content);
}
