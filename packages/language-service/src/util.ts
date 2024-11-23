import { TextDocument } from 'vscode-html-languageservice';
import { Position, Range } from 'vscode-languageserver/node';
import type { CompletionItem } from 'vscode-languageserver/node';

import { SLOT_TOKEN } from './constants';

export function removeSlot(text: string) {
  const v = text.replace(/\$\{[^${]*?\}/g, (str) => str.replaceAll(/[^\n]/g, SLOT_TOKEN));
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

export function translateCompletionList(result: any, position: Position) {
  const getRange = (item: CompletionItem): Range | undefined => {
    if (item.textEdit && 'range' in item.textEdit) {
      const { start, end } = item.textEdit.range;
      return Range.create(
        Position.create(position.line, start.character),
        Position.create(position.line, end.character),
      );
    }
  };

  return {
    ...result,
    items: result?.items.map((item: CompletionItem) => ({
      ...item,
      textEdit: item.textEdit && {
        ...item.textEdit,
        range: getRange(item),
      },
    })),
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
