import fs from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getRequestListener } from '@hono/node-server';
import { logger, type RsbuildPlugin } from '@rsbuild/core';
import type { UnpluginGemOptions } from 'unplugin-gem';
import unpluginGem from 'unplugin-gem/rspack';

import { ELEMENT_PATH, ELEMENTS_FILE, escapeHtml, getDataPath } from '../constants';
import type { DataFile } from '../data';
import type { Renderer } from '../server';
import { type GemkitConfig, generate, getPublicModules, getSrcDir } from './codegen';
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
   * `<srcDir>/elements` 中元素的标签前缀，`<app-foo>` 会自动导入 `<srcDir>/elements/foo`
   * @default 'app'
   */
  elementPrefix?: string;
  /** 传递给 `unplugin-gem` 的选项，默认开启除 `resolvePath` 外的所有功能 */
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
    'HttpError',
    'submitAction',
    'getRequestEvent',
    'formatTitle',
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

function getRedirectHtml(location: string) {
  const url = escapeHtml(location);
  return `<!doctype html><meta charset="utf-8"><title>Redirecting</title><meta http-equiv="refresh" content="0; url=${url}"><link rel="canonical" href="${url}">\n`;
}

// 预渲染并行执行，异步写入不阻塞其他页面的渲染
async function writeFile(webDir: string, pathname: string, content: string) {
  const file = path.join(webDir, decodeURIComponent(pathname));
  await fs.promises.mkdir(path.dirname(file), { recursive: true });
  await fs.promises.writeFile(file, content);
}

export function pluginGemkit(options: GemkitOptions = {}): RsbuildPlugin {
  const { prerender = true, elementPrefix = 'app', gem, ...config } = options;
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
            members: AUTO_IMPORT_MEMBERS,
            elements: { [path.join(srcDir, 'elements')]: { [`${elementPrefix}-*`]: '/*' } },
          },
          autoImportDts: genDts && path.relative(process.cwd(), dtsFile),
          styleMinify: true,
          htmlMinify: true,
          selectorCompatible: true,
          preload: true,
          ssr: true,
          ...gem,
          hmr: gem?.hmr ?? isDev,
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
            alias: getPublicModules(genDir),
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
        const { webDir, serverDir, template } = getDistPaths(distDir);
        // 项目可能是 ESM 包，服务端产物是 CommonJS
        fs.writeFileSync(path.join(serverDir, 'package.json'), '{ "type": "commonjs" }\n');
        // HTML 模版只给服务端使用，避免静态服务器把它当成首页
        fs.renameSync(path.join(webDir, 'index.html'), template);
        if (!prerender) return;
        const { renderer, template: html } = await loadRenderer(distDir);
        const paths = await renderer.getPaths();
        const prerenderPage = async (pathname: string) => {
          const serverElements = new Map<string, string>();
          const result = await renderer.renderDocument(html, pathname, { serverElements });
          const location = result.headers.get('location');
          // 静态托管不能响应跳转，页面使用 `<meta>` 跳转，客户端导航时从数据文件中读取跳转地址
          if (location) {
            await writeFile(webDir, path.posix.join(pathname, 'index.html'), getRedirectHtml(location));
            await writeFile(webDir, getDataPath(pathname), JSON.stringify({ redirect: location } satisfies DataFile));
            return;
          }
          await writeFile(
            webDir,
            path.posix.join(pathname, 'index.html'),
            (await Array.fromAsync(result.html)).join(''),
          );
          // 静态托管时客户端导航使用的纯服务端元素，导航时总会请求，没有元素时也输出
          await writeFile(
            webDir,
            getDataPath(pathname, ELEMENTS_FILE),
            JSON.stringify(Object.fromEntries(serverElements)),
          );
          // 静态托管时客户端导航使用的数据
          if (renderer.hasServerData(pathname)) {
            const dataPath = getDataPath(pathname);
            await writeFile(webDir, dataPath, JSON.stringify((await renderer.loadData(dataPath)).body));
          }
        };
        // 每个请求的状态是独立的，可以并行渲染
        await Promise.all(
          Array.from({ length: PRERENDER_CONCURRENCY }, async () => {
            for (let pathname = paths.shift(); pathname !== undefined; pathname = paths.shift()) {
              await prerenderPage(pathname);
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
