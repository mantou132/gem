import { API } from 'typescript/unstable/async';
import type {
  Disposable,
  ExtensionAPI,
  LspMiddlewareMethod,
  LspMiddlewareTransformer,
} from 'typescript/unstable/vscode';

import { createGemMiddleware } from './middleware';

export const TS7_EXTENSION_ID = 'TypeScriptTeam.native-preview';

// 在 VS Code 的 TypeScript 7 扩展上注册中间件，和 LSP 代理共用同一份变换
export function registerGemMiddleware(ts7: ExtensionAPI): Disposable[] {
  let api: Promise<API<true>> | undefined;
  const getApi = () => {
    api ??= ts7.initializeAPIConnection().then((pipe) => API.fromLSPConnection({ pipe }));
    return api;
  };

  // 语言服务器重启后旧的 API 连接失效
  const onInitialized = ts7.onLanguageServerInitialized(() => {
    api?.then((oldApi) => oldApi.close());
    api = undefined;
  });

  const middleware = createGemMiddleware(getApi);
  const registrations = Object.entries(middleware).map(([method, transformer]) =>
    ts7.registerLspMiddleware(
      method as LspMiddlewareMethod,
      transformer as LspMiddlewareTransformer<LspMiddlewareMethod>,
    ),
  );
  return [onInitialized, ...registrations];
}
