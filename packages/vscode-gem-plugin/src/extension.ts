// eslint-disable-next-line import/no-unresolved
import { languages, commands, window } from 'vscode';
import type { ExtensionContext, DocumentSelector } from 'vscode';

import { HTMLCompletionItemProvider } from './providers/html';
import { CSSCompletionItemProvider, HTMLStyleCompletionItemProvider } from './providers/css';
import { StyleCompletionItemProvider } from './providers/style';
import { HTMLHoverProvider, CSSHoverProvider, StyleHoverProvider } from './providers/hover';
import { markDecorators } from './decorators';

const selector: DocumentSelector = ['typescriptreact', 'javascriptreact', 'typescript', 'javascript'];
const triggers = ['!', '.', '}', ':', '*', '$', ']', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function activate(context: ExtensionContext) {
  markDecorators(context);

  languages.registerHoverProvider(selector, new HTMLHoverProvider());
  languages.registerHoverProvider(selector, new StyleHoverProvider());
  languages.registerHoverProvider(selector, new CSSHoverProvider());

  languages.registerCompletionItemProvider(selector, new HTMLCompletionItemProvider(), '<', ...triggers);
  languages.registerCompletionItemProvider(selector, new HTMLStyleCompletionItemProvider(), ...triggers);
  languages.registerCompletionItemProvider(selector, new CSSCompletionItemProvider(), ...triggers);
  languages.registerCompletionItemProvider(selector, new StyleCompletionItemProvider(), ...triggers);

  const disposable = commands.registerCommand('vscode-plugin-gem.helloWorld', () => {
    window.showInformationMessage('Hello World from vscode-plugin-gem!');
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
