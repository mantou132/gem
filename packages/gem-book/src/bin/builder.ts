import path from 'path';
import { writeFileSync, symlinkSync, renameSync } from 'fs';

import webpack from 'webpack';
import serveStatic from 'serve-static';
import WebpackDevServer from 'webpack-dev-server';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import { GenerateSW } from 'workbox-webpack-plugin';

import { BookConfig, CliUniqueConfig } from '../common/config';
import { STATS_FILE } from '../common/constant';

import { resolveLocalPlugin, resolveTheme, isURL, requireObject } from './utils';

const publicDir = path.resolve(__dirname, '../public');
const entryDir = path.resolve(__dirname, process.env.GEM_BOOK_DEV ? '../src/website' : '../website');
const pluginDir = path.resolve(__dirname, process.env.GEM_BOOK_DEV ? '../src/plugins' : '../plugins');

// dev mode uses memory file system
export function startBuilder(dir: string, options: Required<CliUniqueConfig>, bookConfig: Partial<BookConfig>) {
  const { debug, build, theme, template, output, icon, plugin, ga } = options;

  const plugins = [...plugin];

  plugins.forEach((plugin, index) => {
    const localPath = resolveLocalPlugin(plugin);
    if (localPath) {
      const filename = path.basename(localPath);
      const uniqueFilename = filename + Date.now();
      symlinkSync(localPath, path.resolve(pluginDir, uniqueFilename));
      renameSync(path.resolve(pluginDir, uniqueFilename), path.resolve(pluginDir, filename));
      // load from `plugins` dir
      plugins[index] = filename;
    }
  });

  const isRemoteIcon = isURL(icon);
  const docsDir = path.resolve(dir);
  const outputDir = output ? path.resolve(output) : docsDir;
  const themePath = resolveTheme(theme);

  const compiler = webpack({
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
      new webpack.DefinePlugin({
        'process.env.DEV_MODE': !build,
        'process.env.BOOK_CONFIG': JSON.stringify(bookConfig),
        'process.env.THEME': JSON.stringify(requireObject(themePath)),
        'process.env.PLUGINS': JSON.stringify(plugins),
        'process.env.GA_ID': JSON.stringify(ga),
      }),
      new CopyWebpackPlugin({
        patterns: [{ from: publicDir, to: outputDir }],
      }),
    ]
      .concat(
        build
          ? new GenerateSW({
              navigationPreload: true,
              runtimeCaching: [
                {
                  urlPattern: ({ request }) => request.mode === 'navigate',
                  handler: 'NetworkFirst',
                },
              ],
            })
          : ([] as any),
      )
      .concat(
        outputDir !== docsDir
          ? new CopyWebpackPlugin({
              patterns: [{ from: docsDir, to: outputDir }],
            })
          : ([] as any),
      ),
    devtool: debug && 'source-map',
  });
  if (build) {
    compiler.run((err, stats) => {
      if (err) {
        console.error(err.stack || err);
        return;
      }

      if (!stats) return;

      const info = stats.toJson();

      if (stats.hasErrors()) {
        console.error(info.errors);
        process.exit(1);
      }

      if (stats.hasWarnings()) {
        console.warn(info.warnings);
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
        open: process.env.PORT ? false : true,
        setupMiddlewares: (middlewares, devServer) => {
          devServer.app!.use('/_assets/', serveStatic(process.cwd()));
          return middlewares;
        },
        port: Number(process.env.PORT) || 8091,
      },
      compiler,
    );
    server.startCallback((err) => {
      if (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      }
    });

    return server;
  }
}
