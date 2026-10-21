import type { API } from 'typescript/unstable/async';
import type {
  Disposable,
  ExtensionAPI,
  LspMiddlewareMethod,
  LspMiddlewareTransformer,
} from 'typescript/unstable/vscode';

import type { GemConfiguration } from './configuration';
import { defaultConfiguration } from './configuration';
import type { GemService } from './middleware';
import { createGemMiddleware } from './middleware';
import { loadTsModules } from './ts';

export const TS7_EXTENSION_ID = 'TypeScriptTeam.native-preview';

// 在 VS Code 的 TypeScript 7 扩展上注册中间件，和 LSP 代理共用同一份变换
export function registerGemMiddleware(
  ts7: ExtensionAPI,
  getConfig: () => Partial<GemConfiguration>,
  /** 文件修改的事件，参数是文件 URI，中间件看不到文档同步通知 */
  onDidChangeFiles: (listener: (uri: string) => void) => Disposable,
  /** 语言服务器首次初始化时调用，宿主注册中间件之外的功能 */
  onDidActivate: (service: GemService) => void,
): Disposable[] {
  let api: Promise<API<true>> | undefined;
  const getApi = () => api ?? Promise.reject(new Error('TypeScript 7 language server is not initialized'));
  const service = createGemMiddleware(getApi, () => ({ ...defaultConfiguration, ...getConfig() }));
  const { middleware, invalidate } = service;

  // 每次语言服务器初始化后，从其使用的 TypeScript 中加载版本匹配的 API 客户端，旧的连接失效
  // 已经初始化时注册监听器会立即调用
  const onInitialized = ts7.onLanguageServerInitialized((sdk) => {
    const oldApi = api;
    api = loadTsModules(sdk).then(async (modules) => {
      const pipe = await sdk.initializeAPIConnection();
      return modules.api.API.fromLSPConnection({ pipe });
    });
    oldApi?.then((old) => old.close()).catch(() => {});
    invalidate();
    if (!oldApi) onDidActivate(service);
  });

  const registrations = Object.entries(middleware).map(([method, transformer]) =>
    ts7.registerLspMiddleware(
      method as LspMiddlewareMethod,
      transformer as LspMiddlewareTransformer<LspMiddlewareMethod>,
    ),
  );
  return [onInitialized, onDidChangeFiles((uri) => invalidate(uri)), ...registrations];
}
