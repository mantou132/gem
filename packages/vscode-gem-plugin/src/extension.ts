import * as path from 'node:path';

// eslint-disable-next-line import/no-unresolved
import { commands, window, workspace, extensions } from 'vscode';
import type { ExtensionContext } from 'vscode';
import { LanguageClient, TransportKind } from 'vscode-languageclient/node';

import { LANG_SELECTOR } from './constants';

let client: LanguageClient | undefined;

export async function activate(context: ExtensionContext) {
  // TODO: 语言服务移动到 ts 插件中去，但是怎么在 Zed 中配置 vscode.typescript-language-features？
  // https://github.com/microsoft/typescript-template-language-service-decorator
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

  context.subscriptions.push(
    commands.registerCommand('vscode-plugin-gem.helloWorld', () => {
      window.showInformationMessage('Hello World from vscode-plugin-gem!');
    }),
  );

  const extension = extensions.getExtension('vscode.typescript-language-features');
  if (!extension) return;

  await extension.activate();

  const api = extension.exports?.getAPI(0);
  if (!api) return;

  context.subscriptions.push(
    workspace.onDidChangeConfiguration((evt) => {
      if (evt.affectsConfiguration('gem-plugin')) {
        setGemPluginConfig(api);
      }
    }),
  );

  setGemPluginConfig(api);
}

function setGemPluginConfig(api: any) {
  api.configurePlugin('ts-gem-plugin', {});
}

export function deactivate() {
  return client?.stop();
}
