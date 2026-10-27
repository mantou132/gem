import fs from 'node:fs';
import path from 'node:path';

/** 构建后输出平台文件时使用的路径和 HTML 模版 */
export interface AdapterContext {
  /** 项目根目录 */
  rootPath: string;
  /** `dist` */
  distDir: string;
  /** 客户端资源和预渲染的文件，平台应该作为静态文件提供 */
  webDir: string;
  /** 服务端产物 */
  serverDir: string;
  /** 设置了 `revalidate` 的页面在构建时预渲染的文件，`gemkit start` 作为 ISR 的初始缓存 */
  cacheDir: string;
  /**
   * 服务端构建的函数入口（CommonJS，没有其他依赖），命名导出 `createHandler(template)`，
   * 返回 `runtime` 模块的 `createHandler` 的结果
   */
  handlerFile: string;
  /** HTML 模版，平台的入口调用 `createHandler(template)` 时传入 */
  template: string;
}

/**
 * 部署平台：预渲染的文件由平台作为静态文件提供，其他请求由平台的函数处理
 *
 * @example
 * ```ts
 * pluginGemkit({ adapter: cloudflare() })
 * ```
 */
export interface GemkitAdapter {
  name: string;
  /**
   * 运行时模块，可以是包名或者绝对路径，服务端构建时打包，
   * 导出 `createHandler(renderer, template)`，返回平台需要的处理函数，
   * 一般使用 `@mantou/gemkit/handler` 的 `createFetchHandler`
   */
  runtime: string;
  /** 构建后输出平台需要的文件 */
  write(ctx: AdapterContext): void | Promise<void>;
}

/** 写入文件，目录不存在时创建 */
export const writeFile = (file: string, content: string) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
};

/** 入口中导入服务端构建的 `createHandler` 的路径 */
export const importPath = (from: string, file: string) => JSON.stringify(path.relative(from, file));
