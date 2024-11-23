// https://code.visualstudio.com/api/language-extensions/language-server-extension-guide#testing-the-language-server

import * as assert from 'node:assert';

// eslint-disable-next-line import/no-unresolved
import * as vscode from 'vscode';

suite('Utils', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('removeSlot', () => {
    assert.strictEqual(-1, [1, 2, 3].indexOf(5));
    assert.strictEqual(-1, [1, 2, 3].indexOf(0));
  });
});
