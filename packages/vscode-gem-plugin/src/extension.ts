import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import type { PluginConfiguration } from 'ts-gem-plugin/src/configuration';
import type { ExtensionContext, WorkspaceConfiguration } from 'vscode';
import { commands, extensions, Range, window, workspace } from 'vscode';
import { LanguageClient, TransportKind } from 'vscode-languageclient/node';

import { exec, showTask } from './utils';

const langSelectors = ['typescriptreact', 'javascriptreact', 'typescript', 'javascript'];

const typeScriptExtensionId = 'vscode.typescript-language-features';
const pluginId = 'ts-gem-plugin';
const configurationSection = 'gem';
const gritDir = path.join(__dirname, '../patterns');

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

  (await fs.readdir(gritDir)).forEach((file) => {
    const fileName = path.basename(file, '.md');
    context.subscriptions.push(
      commands.registerCommand(`vscode-plugin-gem.${fileName}`, async () => {
        await checkGritInstalled();
        await grit(fileName);
      }),
    );
  });

  context.subscriptions.push(
    commands.registerCommand(`vscode-plugin-gem.useSwcPlugin`, async () => {
      await checkGritInstalled();
      await grit('remove_import');
      await grit('memo_to_getter');
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

type TupleUnion<U extends string, R extends string[] = []> = {
  [S in U]: Exclude<U, S> extends never ? [...R, S] : TupleUnion<Exclude<U, S>, [...R, S]>;
}[U] &
  string[];

function getConfiguration(): Partial<PluginConfiguration> {
  const config = workspace.getConfiguration(configurationSection);
  const outConfig: Partial<PluginConfiguration> = {
    emmet: workspace.getConfiguration('emmet') as PluginConfiguration['emmet'],
  };

  (['strict', 'emmet', 'elementDefineRules'] as TupleUnion<keyof PluginConfiguration>).forEach((k) => {
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

async function checkGritInstalled() {
  try {
    await exec(`grit --version`);
  } catch {
    await showTask('Grit CLI is not installed, Install ...', exec(`npm install -g @getgrit/cli`));
  }
}

async function grit(name: string) {
  try {
    const editor = window.activeTextEditor;
    if (!editor) return;

    const doc = editor.document;
    const gritFilePath = path.join(gritDir, `./${name}.md`);
    const command = `grit apply --force --stdin --language ${doc.languageId} ${gritFilePath}`;
    const result = await showTask('Refactor...', exec(command, doc.getText()));
    if (result) {
      return editor.edit((editBuilder) => {
        const range = doc.validateRange(new Range(0, 0, doc.lineCount, 0));
        editBuilder.replace(range, result);
      });
    }
  } catch (err) {
    window.showErrorMessage(`Error: ${err.message}`);
  }
}
