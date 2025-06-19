import * as path from 'node:path';

import type { PluginConfiguration } from 'ts-gem-plugin/src/configuration';
import type { ExtensionContext, WorkspaceConfiguration } from 'vscode';
import { commands, extensions, window, workspace } from 'vscode';
import { LanguageClient, TransportKind } from 'vscode-languageclient/node';

const langSelectors = ['typescriptreact', 'javascriptreact', 'typescript', 'javascript'];

const typeScriptExtensionId = 'vscode.typescript-language-features';
const pluginId = 'ts-gem-plugin';
const configurationSection = 'gem';

let client: LanguageClient | undefined;

export async function activate(context: ExtensionContext) {
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
      documentSelector: langSelectors,
    },
  );
  client.start();

  context.subscriptions.push(
    commands.registerCommand('vscode-plugin-gem.helloWorld', () => {
      window.showInformationMessage('Hello World from vscode-plugin-gem!');
    }),
  );

  const extension = extensions.getExtension(typeScriptExtensionId);
  if (!extension) return;

  await extension.activate();

  const api = extension.exports?.getAPI(0);
  if (!api) return;

  context.subscriptions.push(
    workspace.onDidChangeConfiguration((evt) => {
      if (evt.affectsConfiguration(configurationSection)) {
        synchronizeConfiguration(api);
      }
    }),
  );

  synchronizeConfiguration(api);
}

export function deactivate() {
  return client?.stop();
}

function synchronizeConfiguration(api: any) {
  api.configurePlugin(pluginId, getConfiguration());
}

function getConfiguration(): Partial<PluginConfiguration> {
  const config = workspace.getConfiguration(configurationSection);
  const outConfig: Partial<PluginConfiguration> = {
    emmet: workspace.getConfiguration('emmet') as PluginConfiguration['emmet'],
  };

  (['emmet', 'elementDefineRules'] as (keyof PluginConfiguration)[]).forEach((k) => {
    withConfigValue<any>(config, k, (v) => {
      outConfig[k] = v;
    });
  });

  return outConfig;
}

function withConfigValue<T>(config: WorkspaceConfiguration, key: string, withValue: (value: T) => void): void {
  const configSetting = config.inspect(key);
  if (!configSetting) {
    return;
  }

  // Make sure the user has actually set the value.
  // VS Code will return the default values instead of `undefined`, even if user has not don't set anything.
  if (
    typeof configSetting.globalValue === 'undefined' &&
    typeof configSetting.workspaceFolderValue === 'undefined' &&
    typeof configSetting.workspaceValue === 'undefined'
  ) {
    return;
  }

  const value = config.get<T | undefined>(key, undefined);
  if (typeof value !== 'undefined') {
    withValue(value);
  }
}
