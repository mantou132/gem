import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import type { GemConfiguration } from 'ts-gem-lsp/src/configuration';
import { registerGemMiddleware, TS7_EXTENSION_ID } from 'ts-gem-lsp/src/vscode';
import type { ExtensionContext, TextDocument, WorkspaceConfiguration } from 'vscode';
import { commands, Disposable, extensions, Range, window, workspace } from 'vscode';
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

  // TypeScript 7 不再加载 tsserver 插件，通过中间件提供 Gem 支持
  const ts7 = await extensions.getExtension(TS7_EXTENSION_ID)?.activate();
  // 旧版本的 TypeScript 7 扩展没有中间件 API
  if (ts7?.registerLspMiddleware) {
    // 新增和删除的文件由文件列表的变化发现，这里只需要修改事件
    const watcher = workspace.createFileSystemWatcher('**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}', true, false, true);
    const isScript = (document: TextDocument) => langSelectors.includes(document.languageId);
    const onDidChangeFiles = (listener: (uri: string) => void) =>
      Disposable.from(
        workspace.onDidChangeTextDocument(({ document }) => isScript(document) && listener(document.uri.toString())),
        workspace.onDidCloseTextDocument((document) => isScript(document) && listener(document.uri.toString())),
        watcher.onDidChange((uri) => listener(uri.toString())),
      );
    context.subscriptions.push(watcher, ...registerGemMiddleware(ts7, getConfiguration, onDidChangeFiles));
  }

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

// ts-gem-plugin 会忽略只有 ts-gem-lsp 支持的配置
function getConfiguration(): Partial<GemConfiguration> {
  const config = workspace.getConfiguration(configurationSection);
  const outConfig: Partial<GemConfiguration> = {
    emmet: workspace.getConfiguration('emmet') as GemConfiguration['emmet'],
  };

  (['strict', 'ssr', 'emmet', 'elementDefineRules'] as TupleUnion<keyof GemConfiguration>).forEach((k) => {
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
