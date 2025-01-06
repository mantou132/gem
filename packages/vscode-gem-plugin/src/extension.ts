// eslint-disable-next-line import/no-unresolved
import { commands, window, workspace, extensions, languages } from 'vscode';
import type { ExtensionContext, WorkspaceConfiguration } from 'vscode';

import { ColorProvider } from './color';

const typeScriptExtensionId = 'vscode.typescript-language-features';
const pluginId = 'ts-gem-plugin';
const configurationSection = 'gem';

export async function activate(context: ExtensionContext) {
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
    languages.registerColorProvider(
      [
        { scheme: 'file', language: 'typescript' },
        { scheme: 'file', language: 'javascript' },
      ],
      new ColorProvider(),
    ),
  );

  synchronizeConfiguration(api);
}

function synchronizeConfiguration(api: any) {
  api.configurePlugin(pluginId, getConfiguration());
}

interface SynchronizedConfiguration {
  emmet: any;
  tags?: ReadonlyArray<string>;
  format: {
    enabled?: boolean;
  };
}

function getConfiguration(): SynchronizedConfiguration {
  const config = workspace.getConfiguration(configurationSection);
  const outConfig: SynchronizedConfiguration = {
    format: {},
    emmet: workspace.getConfiguration('emmet'),
  };

  withConfigValue<string[]>(config, 'tags', (tags) => {
    outConfig.tags = tags;
  });

  withConfigValue<boolean>(config, 'format.enabled', (enabled) => {
    outConfig.format.enabled = enabled;
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
