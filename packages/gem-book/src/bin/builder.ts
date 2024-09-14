import path from 'path';
import { writeFileSync, symlinkSync, renameSync } from 'fs';

import { rspack, DefinePlugin, HtmlRspackPlugin, CopyRspackPlugin } from '@rspack/core';
import { RspackDevServer } from '@rspack/dev-server';
import { GenerateSW } from '@aaroon/workbox-rspack-plugin';
import { static as serveStatic } from 'express';

import type { BookConfig, CliUniqueConfig } from '../common/config';
import { STATS_FILE } from '../common/constant';

import { resolveLocalPlugin, resolveTheme, isURL, importObject, print } from './utils';
import { ExecHTMLPlugin, FallbackLangPlugin, LocalSearchSearch, SitemapPlugin } from './plugins';

const publicDir = path.resolve(__dirname, '../public');
const entryDir = path.resolve(__dirname, process.env.GEM_BOOK_DEV ? '../src/website' : '../website');
const pluginDir = path.resolve(__dirname, process.env.GEM_BOOK_DEV ? '../src/plugins' : '../plugins');

function getPluginRecord(pluginList: string[]) {
  return Object.fromEntries<{ name: string; url: string }>(
    pluginList.map((plugin) => {
      const [base, ...rest] = plugin.split(/(\?)/);
      const search = rest.join('');
      const pluginPath = resolveLocalPlugin(base);
      if (!pluginPath) return [plugin, { name: plugin, url: 'gbp:' + plugin }];
      if (pluginPath.custom) {
        const filename = path.basename(pluginPath.custom);
        const uniqueFilename = filename + Date.now();
        const symLinkPath = path.resolve(pluginDir, filename);
        symlinkSync(pluginPath.custom, path.resolve(pluginDir, uniqueFilename));
        // 替换内置文件
        renameSync(path.resolve(pluginDir, uniqueFilename), symLinkPath);
        return [pluginPath.custom, { name: filename, url: 'gbp:' + filename + search }];
      }
      return [pluginPath.builtIn!, { name: base, url: 'gbp:' + base + search }];
    }),
  );
}

// dev mode uses memory file system
export async function buildApp(dir: string, options: Required<CliUniqueConfig>, bookConfig: BookConfig) {
  const { debug, build, theme, template, output, icon, ga, site, port, plugin } = options;
  const isRemoteIcon = isURL(icon);
  const docsDir = path.resolve(dir);
  // 开发模式时使用 docsDir 避免不必要的复制
  const outputDir = build && output ? path.resolve(output) : docsDir;
  const pluginRecord = getPluginRecord(
    plugin
      // 自动加载
      .concat(options.fallbackLanguage && 'trans-status')
      .filter((e) => !!e),
  );
  const plugins = Object.values(pluginRecord);
  const themePath = resolveTheme(theme);

  const docSearchPlugin = plugins.find((e) => e.name === 'docsearch')?.url;
  const isLocalSearch = docSearchPlugin && new URL(docSearchPlugin).searchParams.has('local');

  const compiler = rspack({
    stats: build ? 'normal' : 'errors-warnings',
    mode: build ? 'production' : 'development',
    entry: [entryDir],
    module: {
      rules: [
        process.env.GEM_BOOK_REPLACE && {
          test: /\.j|ts$/,
          include: /plugins/,
          loader: require.resolve('string-replace-loader'),
          options: {
            search: /\/\*\*\s*GEM_BOOK_REPLACE\s*(\*\/)?/gm,
            replace: '',
          },
        },
        {
          test: /\.j|ts$/,
          include: /plugins/,
          loader: require.resolve('string-replace-loader'),
          options: {
            // 插件 query 参数传递
            search: 'import.meta.url',
            replace(this: { resource: string }): string {
              // 如果是符号链接返回的是原始路径
              const pluginInfo =
                pluginRecord[this.resource] ||
                // 如果是 GemBook 本身 GEM_BOOK_DEV 模式，路径是 src
                pluginRecord[this.resource.replace(/\/src\/plugins\/(\w*)\.ts/, '/plugins/$1.js')];
              return JSON.stringify(pluginInfo ? pluginInfo.url : '');
            },
          },
        },
        {
          test: /\.ts$/,
          use: [
            {
              // https://github.com/swc-project/swc/issues/9565
              loader: require.resolve('ts-loader'),
              options: {
                // Install cli without installing dev @types dependency
                transpileOnly: true,
                compilerOptions: {
                  module: 'esnext',
                  declarationMap: false,
                },
              },
            },
          ],
        },
      ].filter((e) => !!e),
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    output: {
      path: outputDir,
      publicPath: '/',
      filename: '[name].bundle.js?[contenthash]',
      chunkFilename: '[name].bundle.js?[contenthash]',
    },
    optimization: {
      splitChunks: {
        chunks: 'all',
      },
    },
    devtool: debug && 'source-map',
    plugins: [
      new HtmlRspackPlugin({
        title: bookConfig.title || 'GemBook App',
        template: template ? path.resolve(process.cwd(), template) : 'auto',
        // Automatically copied to the output directory
        favicon: !isRemoteIcon ? icon : undefined,
        meta: {
          viewport: 'width=device-width, initial-scale=1, shrink-to-fit=no',
        },
      }),
      new FallbackLangPlugin(options.fallbackLanguage),
      new ExecHTMLPlugin(),
      new DefinePlugin({
        'process.env.DEV_MODE': !build,
        'process.env.BOOK_CONFIG': JSON.stringify(bookConfig),
        'process.env.THEME': JSON.stringify(await importObject(themePath)),
        'process.env.PLUGINS': JSON.stringify(plugins.map(({ name }) => name)),
        'process.env.GA_ID': JSON.stringify(ga),
      }),
      new CopyRspackPlugin({ patterns: [{ from: publicDir, to: outputDir }] }),
      isLocalSearch && new LocalSearchSearch(docsDir, bookConfig),
      !!site && new SitemapPlugin(site, bookConfig),
      build &&
        new GenerateSW({
          navigationPreload: true,
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.mode === 'navigate',
              handler: 'NetworkFirst',
            },
          ],
        }),
      outputDir !== docsDir &&
        new CopyRspackPlugin({
          patterns: [{ from: docsDir, to: outputDir }],
        }),
    ].filter((e) => !!e),
  });
  if (build) {
    compiler.run((err, stats) => {
      if (err) {
        print(err);
        return;
      }

      if (!stats) return;

      const info = stats.toJson({});

      if (stats.hasErrors()) {
        info.errors?.forEach((error) => print(Object.assign(new Error(error.message), { stack: error.stack })));
        process.exit(1);
      }

      if (stats.hasWarnings()) {
        info.errors?.forEach((warning) => print(warning.message));
      }

      if (debug) {
        writeFileSync(path.resolve(outputDir, STATS_FILE), JSON.stringify(stats.toJson({ colors: true }), null, 2));
      }
    });
  } else {
    // https://github.com/webpack/webpack-dev-server/blob/master/examples/api/simple/server.js
    const server = new RspackDevServer(
      {
        hot: true,
        liveReload: false,
        client: {
          overlay: false,
          webSocketTransport: require.resolve('../public/custom-ws-client'),
        },
        static: {
          directory: outputDir,
        },
        headers: {
          'Cache-Control': 'no-store',
        },
        historyApiFallback: true,
        setupMiddlewares: (middlewares, devServer) => {
          devServer.app!.use('/_assets/', serveStatic(process.cwd()));
          return middlewares;
        },
        port,
      },
      compiler,
    );

    return server;
  }
}
