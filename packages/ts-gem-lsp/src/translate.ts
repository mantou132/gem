import type {
  CompletionItem,
  CompletionList,
  FoldingRange,
  Hover,
  TextEdit,
} from '@mantou/vscode-html-languageservice';

import type { VirtualDocument } from './template';

/**
 * `completionItem/resolve` 也会发给 TypeScript，使用 TypeScript 的数据格式避免其报错，
 * 名称加上前缀使 TypeScript 找不到对应的补全项而原样返回
 */
export interface GemCompletionData {
  fileName: string;
  position: number;
  name: string;
  gem: true;
}

function translateTextEdit(vDoc: VirtualDocument, edit: TextEdit): TextEdit {
  return { newText: edit.newText, range: vDoc.toRange(edit.range) };
}

function translateCompletionItem(vDoc: VirtualDocument, offset: number, item: CompletionItem): CompletionItem {
  const { textEdit, additionalTextEdits } = item;
  const data: GemCompletionData = { fileName: vDoc.fileName, position: offset, name: `gem:${item.label}`, gem: true };
  return {
    ...item,
    data,
    textEdit:
      textEdit && 'range' in textEdit
        ? translateTextEdit(vDoc, textEdit)
        : textEdit && {
            newText: textEdit.newText,
            insert: vDoc.toRange(textEdit.insert),
            replace: vDoc.toRange(textEdit.replace),
          },
    additionalTextEdits: additionalTextEdits?.map((edit) => translateTextEdit(vDoc, edit)),
  };
}

export function translateCompletionList(vDoc: VirtualDocument, offset: number, list: CompletionList): CompletionList {
  return { ...list, items: list.items.map((item) => translateCompletionItem(vDoc, offset, item)) };
}

export function translateHover(vDoc: VirtualDocument, hover: Hover | null): Hover | null {
  return hover && { ...hover, range: hover.range && vDoc.toRange(hover.range) };
}

/** 只需要转换行号 */
export function translateFoldingRange(vDoc: VirtualDocument, range: FoldingRange): FoldingRange {
  const { start, end } = vDoc.toRange({
    start: { line: range.startLine, character: 0 },
    end: { line: range.endLine, character: 0 },
  });
  return { ...range, startLine: start.line, endLine: end.line, startCharacter: undefined, endCharacter: undefined };
}
