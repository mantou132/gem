import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
// eslint-disable-next-line import/no-unresolved
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';

suite('Utils', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('removeSlot', () => {
    assert.strictEqual(-1, [1, 2, 3].indexOf(5));
    assert.strictEqual(-1, [1, 2, 3].indexOf(0));
  });
});
