// https://github.com/microsoft/TypeScript/issues/59482

// eslint-disable-next-line import/no-unresolved
import { workspace, window, Range } from 'vscode';
import type { DecorationOptions, ExtensionContext } from 'vscode';
import { debounce } from 'duoyun-ui/lib/timer';

import { LANG_SELECTOR } from './constants';

const decorationType = window.createTextEditorDecorationType({ opacity: '1 !important' });
const hooksRegExp = /(?<=^\s*@\w+\([^@\n]*\)\s+)(#\w+)/gm;

let activeEditor = window.activeTextEditor;

const updateDecorations = debounce(() => {
  if (!activeEditor || !activeEditor.document) {
    return;
  }
  if (!LANG_SELECTOR.includes(activeEditor.document.languageId)) return;
  const text = activeEditor.document.getText();
  const decorations: DecorationOptions[] = [];
  let match;
  while ((match = hooksRegExp.exec(text))) {
    const startPos = activeEditor.document.positionAt(match.index);
    const endPos = activeEditor.document.positionAt(match.index + match[0].length);
    decorations.push({ range: new Range(startPos, endPos) });
  }
  activeEditor.setDecorations(decorationType, decorations);
});

if (activeEditor) {
  updateDecorations();
}

export function markDecorators(context: ExtensionContext) {
  context.subscriptions.push(
    window.onDidChangeActiveTextEditor((editor) => {
      activeEditor = editor;
      if (editor) {
        updateDecorations();
      }
    }),
  );

  context.subscriptions.push(
    workspace.onDidChangeTextDocument((event) => {
      if (activeEditor && event.document === activeEditor.document) {
        updateDecorations();
      }
    }),
  );
}
