import * as path from 'node:path';

// eslint-disable-next-line import/no-unresolved
import { commands, window, workspace } from 'vscode';
import type { ExtensionContext } from 'vscode';
import { LanguageClient, TransportKind } from 'vscode-languageclient/node';

import { markDecorators } from './decorators';
import { LANG_SELECTOR } from './constants';

let client: LanguageClient | undefined;

export function activate(context: ExtensionContext) {
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

  markDecorators(context);
  context.subscriptions.push(
    commands.registerCommand('vscode-plugin-gem.helloWorld', () => {
      window.showInformationMessage('Hello World from vscode-plugin-gem!');
    }),
  );
}

export function deactivate() {
  return client?.stop();
}
