import * as path from 'node:path';

// eslint-disable-next-line import/no-unresolved
import { languages, commands, window, workspace } from 'vscode';
import type { ExtensionContext } from 'vscode';
import { LanguageClient, TransportKind } from 'vscode-languageclient/node';

import { HTMLCompletionItemProvider } from './providers/html';
import { CSSCompletionItemProvider, HTMLStyleCompletionItemProvider } from './providers/css';
import { StyleCompletionItemProvider } from './providers/style';
import { ColorProvider } from './providers/color';
import { HTMLHoverProvider, CSSHoverProvider, StyleHoverProvider } from './providers/hover';
import { markDecorators } from './decorators';
import { markDiagnostic } from './diagnostic';
import { LANG_SELECTOR } from './constants';

const triggers = ['!', '.', '}', ':', '*', '$', ']', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

let client: LanguageClient | undefined;
function useLS(context: ExtensionContext) {
  const serverModule = context.asAbsolutePath(path.join('dist', 'server.js'));
  client = new LanguageClient(
    'languageServerGem',
    'Gem Language Server',
    {
      run: { module: serverModule, transport: TransportKind.ipc },
      debug: {
        module: serverModule,
        transport: TransportKind.ipc,
        options: { execArgv: ['--nolazy', '--inspect=6009'] },
      },
    },
    {
      documentSelector: LANG_SELECTOR,
      synchronize: { fileEvents: workspace.createFileSystemWatcher('**/.gemrc') },
    },
  );
  client.start();
}

export function activate(context: ExtensionContext) {
  markDecorators(context);
  markDiagnostic(context);

  context.subscriptions.push(languages.registerColorProvider(LANG_SELECTOR, new ColorProvider()));
  context.subscriptions.push(languages.registerHoverProvider(LANG_SELECTOR, new HTMLHoverProvider()));
  context.subscriptions.push(languages.registerHoverProvider(LANG_SELECTOR, new StyleHoverProvider()));
  context.subscriptions.push(languages.registerHoverProvider(LANG_SELECTOR, new CSSHoverProvider()));
  context.subscriptions.push(
    languages.registerCompletionItemProvider(LANG_SELECTOR, new HTMLCompletionItemProvider(), '<', ...triggers),
  );
  context.subscriptions.push(
    languages.registerCompletionItemProvider(LANG_SELECTOR, new HTMLStyleCompletionItemProvider(), ...triggers),
  );
  context.subscriptions.push(
    languages.registerCompletionItemProvider(LANG_SELECTOR, new CSSCompletionItemProvider(), ...triggers),
  );
  context.subscriptions.push(
    languages.registerCompletionItemProvider(LANG_SELECTOR, new StyleCompletionItemProvider(), ...triggers),
  );

  context.subscriptions.push(
    commands.registerCommand('vscode-plugin-gem.helloWorld', () => {
      window.showInformationMessage('Hello World from vscode-plugin-gem!');
    }),
  );

  // TODO: 扩展配置
  const enabledLS = false;
  if (enabledLS) {
    useLS(context);
  }
}

export function deactivate() {
  return client?.stop();
}
