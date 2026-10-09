#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import type { API } from 'typescript/unstable/async';
import { createTypeScriptModuleLoader } from 'typescript/unstable/vscode';
import type {
  MessageReader,
  MessageWriter,
  NotificationMessage,
  RequestMessage,
  ResponseMessage,
} from 'vscode-jsonrpc/node.js';
import { Message, StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node.js';

import type { GemConfiguration } from './configuration';
import { defaultConfiguration } from './configuration';
import type { Transformer } from './middleware';
import { createGemMiddleware } from './middleware';
import { loadTsModules } from './ts';

// 编辑器以项目根目录作为工作目录启动语言服务器
function resolveProjectTypeScript7() {
  try {
    const require = createRequire(path.join(process.cwd(), 'package.json'));
    const dir = path.dirname(require.resolve('typescript/package.json'));
    if (existsSync(path.join(dir, 'lib/getExePath.js'))) return dir;
  } catch {}
}

// 项目不是 TypeScript 7 时由 vtsls + ts-gem-plugin 提供支持，
// 编辑器无法跳过扩展注册的语言服务器，所以启动一个不提供任何能力的服务器
function startNoopServer(clientReader: MessageReader, clientWriter: MessageWriter) {
  clientReader.listen((msg) => {
    if (Message.isRequest(msg)) {
      const result = msg.method === 'initialize' ? { capabilities: {} } : null;
      clientWriter.write({ jsonrpc: '2.0', id: msg.id, result } as ResponseMessage);
    } else if (Message.isNotification(msg) && msg.method === 'exit') {
      process.exit(0);
    }
  });
}

type FileChangeParams = { textDocument?: { uri: string }; changes?: { uri: string }[] };

// 编辑器中的修改，以及磁盘上的修改（例如 `git checkout`）
function getChangedFiles({ method, params }: NotificationMessage) {
  switch (method) {
    case 'textDocument/didChange':
    case 'textDocument/didClose':
      return [(params as FileChangeParams).textDocument!.uri];
    case 'workspace/didChangeWatchedFiles':
      return (params as FileChangeParams).changes!.map(({ uri }) => uri);
    default:
      return [];
  }
}

async function startProxy(tsDir: string, clientReader: MessageReader, clientWriter: MessageWriter) {
  // API 客户端和启动的 tsc 来自同一个 TypeScript
  const modules = await loadTsModules(createTypeScriptModuleLoader(path.join(tsDir, 'package.json')));
  const { default: getExePath } = await import(pathToFileURL(path.join(tsDir, 'lib/getExePath.js')).href);
  const server = spawn(getExePath(), ['--lsp', '--stdio'], { stdio: ['pipe', 'pipe', 'inherit'] });
  server.on('exit', (code) => process.exit(code ?? 0));
  process.stdin.on('end', () => server.kill());
  const serverReader = new StreamMessageReader(server.stdout);
  const serverWriter = new StreamMessageWriter(server.stdin);

  // 代理自己发给 tsc 的请求，响应不转发给编辑器
  const ownRequests = new Map<string, (msg: ResponseMessage) => void>();
  let ownId = 0;
  const request = <R>(method: string, params: unknown) =>
    new Promise<R>((resolve, reject) => {
      const id = `gem:${ownId++}`;
      ownRequests.set(id, (msg) => (msg.error ? reject(msg.error) : resolve(msg.result as R)));
      serverWriter.write({ jsonrpc: '2.0', id, method, params } as RequestMessage);
    });

  const { promise: api, resolve: resolveApi } = Promise.withResolvers<API<true>>();
  // 编辑器通过 `initializationOptions.gem` 或者 `settings.gem` 提供配置
  let config = defaultConfiguration;
  const updateConfig = (gem?: Partial<GemConfiguration>) => {
    if (gem) config = { ...defaultConfiguration, ...gem };
  };
  const { middleware, invalidate } = createGemMiddleware(
    () => api,
    () => config,
  );
  type Method = keyof typeof middleware;
  const pendingRequests = new Map<RequestMessage['id'], RequestMessage>();

  clientReader.listen(async (msg) => {
    if (Message.isRequest(msg) && msg.method === 'initialize') {
      updateConfig((msg.params as { initializationOptions?: { gem?: GemConfiguration } }).initializationOptions?.gem);
    }
    if (Message.isNotification(msg) && msg.method === 'workspace/didChangeConfiguration') {
      updateConfig((msg.params as { settings?: { gem?: GemConfiguration } }).settings?.gem);
    }
    if (Message.isNotification(msg)) for (const uri of getChangedFiles(msg)) invalidate(uri);
    if (Message.isRequest(msg) && msg.method in middleware) pendingRequests.set(msg.id, msg);
    serverWriter.write(msg);
    if (Message.isNotification(msg) && msg.method === 'initialized') {
      const { pipe } = await request<{ pipe: string }>('custom/initializeAPISession', {});
      resolveApi(await modules.api.API.fromLSPConnection({ pipe }));
    }
  });

  serverReader.listen(async (msg) => {
    if (Message.isResponse(msg) && ownRequests.has(msg.id as string)) {
      ownRequests.get(msg.id as string)!(msg);
      ownRequests.delete(msg.id as string);
      return;
    }
    const req = Message.isResponse(msg) && pendingRequests.get(msg.id!);
    if (req) {
      pendingRequests.delete(req.id);
      const response = msg as ResponseMessage;
      const transform = middleware[req.method as Method] as Transformer<unknown, ResponseMessage['result']>;
      if (response.error) {
        // TypeScript 对模板中的位置可能返回错误（例如 `prepareRename`），Gem 能处理时替换错误
        // VS Code 中间件不会处理错误响应
        const result = await transform(null, { params: req.params }).catch(() => null);
        clientWriter.write(result === null ? response : { jsonrpc: response.jsonrpc, id: response.id, result });
      } else {
        // 和 VS Code 中间件一致：变换失败时使用原始响应
        try {
          response.result = await transform(response.result, { params: req.params });
        } catch (err) {
          process.stderr.write(`[ts-gem-lsp] ${req.method}: ${err}\n`);
        }
        clientWriter.write(response);
      }
      return;
    }
    clientWriter.write(msg);
  });
}

const clientReader = new StreamMessageReader(process.stdin);
const clientWriter = new StreamMessageWriter(process.stdout);
const tsDir = resolveProjectTypeScript7();
if (tsDir) {
  await startProxy(tsDir, clientReader, clientWriter);
} else {
  startNoopServer(clientReader, clientWriter);
}
