// https://github.com/microsoft/TypeScript/issues/59482

// eslint-disable-next-line import/no-unresolved
import { workspace, window, Range } from 'vscode';
import type { DecorationOptions, ExtensionContext } from 'vscode';

const decorationType = window.createTextEditorDecorationType({ opacity: '1 !important' });
const regEx = /(?<=^\s*@\w+\([^@\n]*\)\s+)(#\w+)/gm;

let activeEditor = window.activeTextEditor;
let timeout: NodeJS.Timeout;

function updateDecorations() {
  if (!activeEditor || !activeEditor.document) {
    return;
  }
  const text = activeEditor.document.getText();
  const decorations: DecorationOptions[] = [];
  let match;
  while ((match = regEx.exec(text))) {
    const startPos = activeEditor.document.positionAt(match.index);
    const endPos = activeEditor.document.positionAt(match.index + match[0].length);
    decorations.push({ range: new Range(startPos, endPos) });
  }
  activeEditor.setDecorations(decorationType, decorations);
}

function triggerUpdateDecorations() {
  clearTimeout(timeout);
  timeout = setTimeout(updateDecorations, 0);
}

if (activeEditor) {
  triggerUpdateDecorations();
}

export function markDecorators(context: ExtensionContext) {
  window.onDidChangeActiveTextEditor(
    function (editor) {
      activeEditor = editor;
      if (editor) {
        triggerUpdateDecorations();
      }
    },
    null,
    context.subscriptions,
  );

  workspace.onDidChangeTextDocument(
    function (event) {
      if (activeEditor && event.document === activeEditor.document) {
        triggerUpdateDecorations();
      }
    },
    null,
    context.subscriptions,
  );
}
