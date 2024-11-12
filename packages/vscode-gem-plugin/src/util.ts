// eslint-disable-next-line import/no-unresolved
import { Position, Range } from 'vscode';
import { TextDocument } from 'vscode-html-languageservice';
import type { TextLine, CompletionItem } from 'vscode';
import type { CompletionList as HtmlCompletionList } from 'vscode-html-languageservice';

export function removeSlot(text: string) {
  const v = text.replace(/\$\{[^${]*?\}/g, (str) => str.replaceAll(/[^\n]/g, 'x'));
  if (v === text) return v;
  return removeSlot(v);
}

export function removeHTMLSlot(text: string, position: number) {
  const left = text.slice(0, position);
  const right = text.slice(position);
  const left1 = removeSlot(left);
  // 处理在插槽中的情况，只保留光标附件的 html 标签
  const left2 = left1.replace(/(.*(?=html`))/s, (str) => str.replaceAll(/[^\n]/g, ' '));
  return left2 + removeSlot(right);
}

export function translateCompletionList(list: HtmlCompletionList, line: TextLine, expand?: boolean) {
  return {
    ...list,
    items: list.items.map((item) => {
      const result = item as CompletionItem;

      if (item.textEdit && 'range' in item.textEdit) {
        result.range = new Range(
          new Position(line.lineNumber, item.textEdit.range.start.character),
          new Position(line.lineNumber, item.textEdit.range.end.character),
        );
      }
      delete result.textEdit;

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
  return TextDocument.create(`embedded://document.${languageId}`, languageId, 1, content);
}
