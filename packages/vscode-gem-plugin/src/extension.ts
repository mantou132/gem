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

const selector = ['typescriptreact', 'javascriptreact', 'typescript', 'javascript'];
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
      documentSelector: selector,
      synchronize: { fileEvents: workspace.createFileSystemWatcher('**/.gemrc') },
    },
  );
  client.start();
}

export function activate(context: ExtensionContext) {
  markDecorators(context);
  markDiagnostic(context);

  context.subscriptions.push(languages.registerColorProvider(selector, new ColorProvider()));
  context.subscriptions.push(languages.registerHoverProvider(selector, new HTMLHoverProvider()));
  context.subscriptions.push(languages.registerHoverProvider(selector, new StyleHoverProvider()));
  context.subscriptions.push(languages.registerHoverProvider(selector, new CSSHoverProvider()));
  context.subscriptions.push(
    languages.registerCompletionItemProvider(selector, new HTMLCompletionItemProvider(), '<', ...triggers),
  );
  context.subscriptions.push(
    languages.registerCompletionItemProvider(selector, new HTMLStyleCompletionItemProvider(), ...triggers),
  );
  context.subscriptions.push(
    languages.registerCompletionItemProvider(selector, new CSSCompletionItemProvider(), ...triggers),
  );
  context.subscriptions.push(
    languages.registerCompletionItemProvider(selector, new StyleCompletionItemProvider(), ...triggers),
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
