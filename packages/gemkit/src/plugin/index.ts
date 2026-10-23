import fs from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getRequestListener } from '@hono/node-server';
import { logger, type RsbuildPlugin } from '@rsbuild/core';
import type { UnpluginGemOptions } from 'unplugin-gem';
import unpluginGem from 'unplugin-gem/rspack';

import { ELEMENT_PATH } from '../constants';
import type { Renderer } from '../server';
import { type GemkitConfig, generate, getPublicModules, getSrcDir, SRC_ALIAS } from './codegen';
import { prerenderPage, writeFiles } from './prerender';
import {
  createHandler,
  createRequestHandler,
  getDistPaths,
  type Handler,
  isActionRequest,
  isDataRequest,
  loadRenderer,
} from './serve';

export type { GemkitConfig } from './codegen';

export interface GemkitOptions extends GemkitConfig {
  /**
   * 构建后预渲染所有静态路由和 `paths` 指定的动态路由
   * @default true
   */
  prerender?: boolean;
  /**
   * 传递给 `unplugin-gem` 的选项，默认开启除 `resolvePath` 外的所有功能；
   * `autoImport` 和 Gemkit 的默认值合并，键是包名或者别名，不是文件路径，`src` 是 `<srcDir>` 的别名，
   * 默认 `<app-foo>` 自动导入 `src/elements/foo`，设置 `elements.src` 会替换它
   * @example
   * ```ts
   * {
   *   autoImport: {
   *     members: { 'src/utils': ['format'] },
   *     elements: { src: { 'app-*': '/components/*' }, 'my-ui': { 'my-*': '/elements/*' } },
   *   },
   * }
   * ```
   */
  gem?: UnpluginGemOptions;
}

const packageDir = fileURLToPath(new URL('..', import.meta.url));

const PRERENDER_CONCURRENCY = 8;

const AUTO_IMPORT_MEMBERS = {
  '@mantou/gemkit': [
    'page',
    'layout',
    'server',
    'lazy',
    'client',
    'error',
    'notFound',
    'redirect',
    'submitAction',
    'invalidate',
    'endpoint',
    'revalidatePath',
    'getRequestEvent',
  ],
  '$gemkit/i18n': ['i18n'],
  '$gemkit/api': ['apis'],
};

// 只处理页面、页面数据、表单提交和 API 路由请求，其他请求交给 Rsbuild
const ssrMiddleware =
  (getHandler: () => Promise<Handler>) =>
  async (req: IncomingMessage, res: ServerResponse, next: (err?: unknown) => void) => {
    const { pathname, search } = new URL(req.url!, 'http://localhost');
    const isPage = req.headers.accept?.includes('text/html') && !path.extname(pathname);
    const isPost = req.method === 'POST' && (pathname === ELEMENT_PATH || isActionRequest(req.method, search));
    const isSSR = isPost || (req.method === 'GET' && (isPage || isDataRequest(pathname)));
    try {
      const handler = await getHandler();
      if (!isSSR && !handler.isEndpoint(pathname)) return next();
      // 转换成 `Request` 和 `Response`，不替换全局的 `Request` 和 `Response`
      const listener = getRequestListener(handler, { overrideGlobalObjects: false, errorHandler: next });
      await listener(req, res);
    } catch (err) {
      next(err);
    }
  };

export function pluginGemkit(options: GemkitOptions = {}): RsbuildPlugin {
  const { prerender = true, gem, ...config } = options;
  const { autoImport, ...gemOptions } = gem ?? {};
  const userAutoImport = typeof autoImport === 'object' ? autoImport : {};
  return {
    name: 'gemkit',
    setup(api) {
      const { rootPath } = api.context;
      const srcDir = getSrcDir(rootPath, config);
      const genDir = path.join(rootPath, '.gemkit');
      const distDir = path.join(rootPath, 'dist');
      const isDev = api.context.action === 'dev';

      generate(rootPath, config);

      // 页面和语言文件增删时重新生成
      if (isDev) {
        const watcher = fs.watch(srcDir, { recursive: true }, (_, filename) => {
          if (!filename || !/^(pages|locales)[/\\]|^app\./.test(filename)) return;
          // 编辑中的错误（例如标签名重复、改名时目录短暂不存在）不应该让开发服务器退出
          try {
            generate(rootPath, config);
          } catch (err) {
            logger.error(err);
          }
        });
        api.onCloseDevServer(() => watcher.close());
      }

      // swc 插件在 WASI 中只能访问 cwd，需要相对路径；
      // 文件存在时不会重新生成，启动时删除以应用最新配置
      const dtsFile = path.join(genDir, 'auto-import.d.ts');
      fs.rmSync(dtsFile, { force: true });

      // 只在一个环境中生成 dts，避免并发写入
      const gemPlugin = (genDts: boolean) =>
        unpluginGem({
          include: [srcDir, genDir, path.join(packageDir, 'src')],
          autoImport: {
            extends: 'gem',
            ...userAutoImport,
            members: { ...AUTO_IMPORT_MEMBERS, ...userAutoImport.members },
            elements: { [SRC_ALIAS]: { 'app-*': '/elements/*' }, ...userAutoImport.elements },
          },
          autoImportDts: genDts && path.relative(process.cwd(), dtsFile),
          styleMinify: true,
          htmlMinify: true,
          selectorCompatible: true,
          preload: true,
          ssr: true,
          ...gemOptions,
          hmr: gemOptions.hmr ?? isDev,
        });

      // `*.server.ts` 只能在服务端使用，避免服务端代码泄露到客户端
      api.transform({ test: /\.server\.[cm]?[jt]s$/, environments: ['web'] }, ({ resourcePath }) => {
        throw new Error(`gemkit: \`${path.relative(rootPath, resourcePath)}\` can only be imported on the server`);
      });

      api.modifyRsbuildConfig((userConfig, { mergeRsbuildConfig }) => {
        const userTemplate = path.join(srcDir, 'index.html');
        return mergeRsbuildConfig(userConfig, {
          source: {
            // 没有预渲染时不会输出 `__elements.json`，客户端直接请求服务端渲染元素
            define: { 'process.env.GEMKIT_PRERENDER': JSON.stringify(String(prerender && !isDev)) },
          },
          html: {
            template: fs.existsSync(userTemplate) ? userTemplate : path.join(packageDir, 'template.html'),
            title: config.title,
          },
          resolve: {
            alias: { ...getPublicModules(genDir), [SRC_ALIAS]: srcDir },
          },
          environments: {
            web: {
              source: { entry: { index: path.join(genDir, 'client.ts') } },
              output: { target: 'web', distPath: { root: 'dist/web' } },
              tools: { rspack: { plugins: [gemPlugin(true)] } },
            },
            node: {
              source: { entry: { index: path.join(genDir, 'server.ts') } },
              output: {
                target: 'node',
                // Rsbuild 在开发时运行 ESM 产物需要 `--experimental-vm-modules`
                module: false,
                distPath: { root: 'dist/server' },
              },
              dev: { hmr: false, lazyCompilation: false },
              tools: { rspack: { plugins: [gemPlugin(false)] } },
            },
          },
          server: {
            setup: (ctx) => {
              if (ctx.action === 'dev') {
                const { environments } = ctx.server;
                ctx.server.middlewares.use(
                  ssrMiddleware(async () => {
                    const { default: renderer } = await environments.node.loadBundle<{ default: Renderer }>('index');
                    const template = await environments.web.getTransformedHtml('index');
                    return createRequestHandler(renderer, template);
                  }),
                );
              } else {
                const handler = createHandler(distDir);
                ctx.server.middlewares.use(ssrMiddleware(() => handler));
              }
            },
          },
        });
      });

      api.onAfterBuild(async () => {
        const { webDir, serverDir, cacheDir, template } = getDistPaths(distDir);
        // 项目可能是 ESM 包，服务端产物是 CommonJS
        fs.writeFileSync(path.join(serverDir, 'package.json'), '{ "type": "commonjs" }\n');
        // HTML 模版只给服务端使用，避免静态服务器把它当成首页
        fs.renameSync(path.join(webDir, 'index.html'), template);
        // 上次构建的 ISR 缓存属于旧的代码
        fs.rmSync(cacheDir, { recursive: true, force: true });
        if (!prerender) return;
        const { renderer, template: html } = await loadRenderer(distDir);
        const paths = await renderer.getPaths();
        // 每个请求的状态是独立的，可以并行渲染
        await Promise.all(
          Array.from({ length: PRERENDER_CONCURRENCY }, async () => {
            for (let pathname = paths.shift(); pathname !== undefined; pathname = paths.shift()) {
              const { files } = await prerenderPage(renderer, html, pathname);
              // 使用 ISR 的页面写到缓存中，`gemkit start` 按 `revalidate` 重新渲染
              const isr = (await renderer.getRevalidate(pathname)) !== undefined;
              await writeFiles(isr ? cacheDir : webDir, files);
            }
          }),
        );
        // 静态托管服务使用的 404 页面，layout 不能预渲染时不输出
        const { notFoundPath } = renderer;
        const notFound =
          (await renderer.canPrerender(notFoundPath)) && (await renderer.renderDocument(html, notFoundPath));
        if (notFound && notFound.status === 404) {
          fs.writeFileSync(path.join(webDir, '404.html'), (await Array.fromAsync(notFound.html)).join(''));
        }
        logger.info(`gemkit: prerendered pages to ${path.relative(rootPath, webDir)}`);
      });
    },
  };
}
