import path from 'path';
import { writeFileSync, symlinkSync, renameSync } from 'fs';

import webpack, { DefinePlugin, Compilation, Compiler, sources } from 'webpack';
import serveStatic from 'serve-static';
import WebpackDevServer from 'webpack-dev-server';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import SitemapPlugin from 'sitemap-webpack-plugin';
import { GenerateSW } from 'workbox-webpack-plugin';

import { BookConfig, CliUniqueConfig, NavItem } from '../common/config';
import { STATS_FILE } from '../common/constant';
import { getBody, getLinkPath, getUserLink } from '../common/utils';

import { resolveLocalPlugin, resolveTheme, isURL, importObject, print, getMdFile, getMetadata } from './utils';

const publicDir = path.resolve(__dirname, '../public');
const entryDir = path.resolve(__dirname, process.env.GEM_BOOK_DEV ? '../src/website' : '../website');
const pluginDir = path.resolve(__dirname, process.env.GEM_BOOK_DEV ? '../src/plugins' : '../plugins');

export interface MdDocument {
  id: string;
  title: string;
  text: string;
}

function genDocuments(docsDir: string, bookConfig: BookConfig) {
  const gen = (sidebar: NavItem[], lang = '') => {
    // 防止文件夹重复
    const addedLinks = new Set<string>();
    const documents: MdDocument[] = [];
    const temp = [...sidebar];
    while (temp.length) {
      const item = temp.pop()!;
      if (addedLinks.has(item.link)) continue;
      if (item.sidebarIgnore) continue;
      if (item.children) temp.push(...item.children);
      if (item.type === 'file' || item.type === 'dir') {
        addedLinks.add(item.link);
        const fullPath = path.join(docsDir, lang, item.link);
        documents.push({
          id: getLinkPath(item.link, bookConfig.displayRank),
          text: item.type === 'file' ? getBody(getMdFile(fullPath).content) : '',
          title: getMetadata(fullPath, bookConfig.displayRank).title,
        });
      }
    }
    return documents;
  };
  if (Array.isArray(bookConfig.sidebar)) {
    return { '': gen(bookConfig.sidebar) };
  } else {
    return Object.fromEntries(
      Object.entries(bookConfig.sidebar || {}).map(([lang, { data }]) => [lang, gen(data, lang)]),
    );
  }
}

function genPaths(bookConfig: BookConfig) {
  const result: string[] = [];
  const gen = (sidebar: NavItem[], lang = '') => {
    const temp = [...sidebar];
    while (temp.length) {
      const item = temp.pop()!;
      if (item.sidebarIgnore) continue;
      if (item.children) temp.push(...item.children);
      if (item.type === 'file') {
        result.push(`${lang ? `/${lang}` : ''}${getUserLink(item.link, bookConfig.displayRank)}`);
      }
    }
  };
  if (Array.isArray(bookConfig.sidebar)) {
    gen(bookConfig.sidebar);
  } else {
    Object.entries(bookConfig.sidebar || {}).forEach(([lang, { data }]) => {
      gen(data, lang);
    });
  }
  return result;
}

function getPluginRecord(options: Required<CliUniqueConfig>) {
  return Object.fromEntries<{ name: string; url: string }>(
    options.plugin.map((plugin) => {
      const [base, ...rest] = plugin.split(/(\?)/);
      const search = rest.join('');
      const pluginPath = resolveLocalPlugin(base);
      if (!pluginPath) return [plugin, { name: plugin, url: 'file:' + plugin }];
      if (pluginPath.custom) {
        const filename = path.basename(pluginPath.custom);
        const uniqueFilename = filename + Date.now();
        const symLinkPath = path.resolve(pluginDir, filename);
        symlinkSync(pluginPath.custom, path.resolve(pluginDir, uniqueFilename));
        // 替换内置文件
        renameSync(path.resolve(pluginDir, uniqueFilename), symLinkPath);
        return [pluginPath.custom, { name: filename, url: 'file:' + filename + search }];
      }
      return [pluginPath.builtIn!, { name: base, url: 'file:' + base + search }];
    }),
  );
}

// dev mode uses memory file system
export async function build(dir: string, options: Required<CliUniqueConfig>, bookConfig: BookConfig) {
  const { debug, build, theme, template, output, icon, ga } = options;
  const isRemoteIcon = isURL(icon);
  const docsDir = path.resolve(dir);
  // 开发模式时使用 docsDir 避免不必要的复制
  const outputDir = build && output ? path.resolve(output) : docsDir;
  const pluginRecord = getPluginRecord(options);
  const plugins = Object.values(pluginRecord);
  const themePath = resolveTheme(theme);

  const docSearchPlugin = plugins.find((e) => e.name === 'docsearch')?.url;
  const isLocalSearch = docSearchPlugin && new URL(docSearchPlugin).searchParams.has('local');

  const compiler = webpack({
    stats: build ? 'normal' : 'errors-warnings',
    mode: build ? 'production' : 'development',
    entry: [entryDir],
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: [
            {
              loader: require.resolve('ts-loader'),
              options: {
                // Install cli without installing dev @types dependency
                transpileOnly: true,
                compilerOptions: {
                  module: 'esnext',
                },
              },
            },
          ],
        },
      ],
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
      new HtmlWebpackPlugin({
        title: bookConfig.title || 'Gem-book App',
        ...(template ? { template: path.resolve(process.cwd(), template) } : undefined),
        // Automatically copied to the output directory
        favicon: !isRemoteIcon && icon,
        meta: {
          viewport: 'width=device-width, initial-scale=1, shrink-to-fit=no',
        },
      }),
      new DefinePlugin({
        'import.meta.url': DefinePlugin.runtimeValue(({ module }) =>
          // 如果是符号链接返回的是原始路径
          JSON.stringify(pluginRecord[module.resource]?.url),
        ),
        'process.env.DEV_MODE': !build,
        'process.env.BOOK_CONFIG': JSON.stringify(bookConfig),
        'process.env.THEME': JSON.stringify(await importObject(themePath)),
        'process.env.PLUGINS': JSON.stringify(plugins.map(({ name }) => name)),
        'process.env.GA_ID': JSON.stringify(ga),
      }),
      new CopyWebpackPlugin({ patterns: [{ from: publicDir, to: outputDir }] }),
      isLocalSearch && {
        apply(compiler: Compiler) {
          compiler.hooks.compilation.tap('json-webpack-plugin', (compilation) => {
            compilation.hooks.processAssets.tapPromise(
              {
                name: 'json-webpack-plugin',
                stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
              },
              async () => {
                Object.entries(genDocuments(docsDir, bookConfig)).forEach(([lang, documents]) => {
                  compilation.emitAsset(
                    ['documents', lang, 'json'].filter((e) => !!e).join('.'),
                    new sources.RawSource(JSON.stringify(documents)),
                  );
                });
              },
            );
          });
        },
      },
      options.site && new SitemapPlugin({ base: options.site, paths: genPaths(bookConfig) }),
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
        new CopyWebpackPlugin({
          patterns: [{ from: docsDir, to: outputDir }],
        }),
    ],
  });
  if (build) {
    compiler.run((err, stats) => {
      if (err) {
        print(err);
        return;
      }

      if (!stats) return;

      const info = stats.toJson();

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
    const server = new WebpackDevServer(
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
        port: Number(process.env.PORT) || 8091,
      },
      compiler,
    );

    return server;
  }
}
