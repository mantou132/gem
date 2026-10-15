import fs from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

import { logger, type RsbuildPlugin } from '@rsbuild/core';
import type { UnpluginGemOptions } from 'unplugin-gem';
import unpluginGem from 'unplugin-gem/rspack';

import { getDataPath } from '../constants';
import type { Renderer } from '../server';
import { type GemkitConfig, generate } from './codegen';
import { createHandler, createRequestHandler, getDistPaths, type Handler, isDataRequest, loadRenderer } from './serve';

export type { GemkitConfig } from './codegen';

export interface GemkitOptions extends GemkitConfig {
  /**
   * 构建后预渲染所有静态路由和 `paths` 指定的动态路由
   * @default true
   */
  prerender?: boolean;
  /**
   * `src/elements` 中元素的标签前缀，`<app-foo>` 会自动导入 `src/elements/foo`
   * @default 'app'
   */
  elementPrefix?: string;
  /** 传递给 `unplugin-gem` 的选项，默认开启除 `resolvePath` 外的所有功能 */
  gem?: UnpluginGemOptions;
}

const packageDir = fileURLToPath(new URL('..', import.meta.url));

const PRERENDER_CONCURRENCY = 8;

// 只处理页面和页面数据请求，其他请求交给 Rsbuild
const ssrMiddleware =
  (getHandler: () => Promise<Handler>) =>
  async (req: IncomingMessage, res: ServerResponse, next: (err?: unknown) => void) => {
    const { pathname } = new URL(req.url!, 'http://localhost');
    const isPage = req.headers.accept?.includes('text/html') && !path.extname(pathname);
    if (req.method !== 'GET' || !(isPage || isDataRequest(pathname))) return next();
    try {
      const { status, type, body } = await (await getHandler())(req.url!);
      res.statusCode = status;
      res.setHeader('Content-Type', type === 'json' ? 'application/json' : 'text/html; charset=utf-8');
      await pipeline(Readable.from(body), res);
    } catch (err) {
      next(err);
    }
  };

function writeFile(webDir: string, pathname: string, content: string) {
  const file = path.join(webDir, decodeURIComponent(pathname));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

export function pluginGemkit(options: GemkitOptions = {}): RsbuildPlugin {
  const { prerender = true, elementPrefix = 'app', gem, ...config } = options;
  return {
    name: 'gemkit',
    setup(api) {
      const { rootPath } = api.context;
      const srcDir = path.join(rootPath, 'src');
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
          html: {
            template: fs.existsSync(userTemplate) ? userTemplate : path.join(packageDir, 'template.html'),
            title: config.title,
          },
          resolve: {
            alias: { $gemkit: genDir },
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
          const result = await renderer.renderDocument(html, pathname);
          writeFile(webDir, path.posix.join(pathname, 'index.html'), (await Array.fromAsync(result.html)).join(''));
          // 静态托管时客户端导航使用的数据
          if (renderer.hasServerData(pathname)) {
            const dataPath = getDataPath(pathname);
            writeFile(webDir, dataPath, JSON.stringify((await renderer.loadData(dataPath)).data));
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
        // 静态托管服务使用的 404 页面
        const notFound = await renderer.renderDocument(html, '/__gemkit_404__');
        if (notFound.status === 404) {
          fs.writeFileSync(path.join(webDir, '404.html'), (await Array.fromAsync(notFound.html)).join(''));
        }
        logger.info(`gemkit: prerendered pages to ${path.relative(rootPath, webDir)}`);
      });
    },
  };
}
