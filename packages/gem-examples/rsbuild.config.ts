import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { defineConfig } from '@rsbuild/core';
import unpluginGem from 'unplugin-gem/rspack';

import { version } from '../gem/package.json';

const require = createRequire(import.meta.url);

const swcPluginPath = '../../crates/swc-plugin-gem/swc_plugin_gem.wasm';

const examples = fs
  .readdirSync('src', { withFileTypes: true })
  .filter((example) => example.isDirectory() && example.name !== 'elements')
  .map((dir) => dir.name);

const ensureSwcPlugin: () => void = () => {
  const dir = path.dirname(path.resolve(__dirname, swcPluginPath));
  const run = (cmd: string) => {
    const [bin, ...args] = cmd.split(' ');
    const result = spawnSync(bin, args, { cwd: dir, stdio: 'inherit', shell: true });
    if (result.status !== 0) throw new Error(`swc-plugin-gem 构建失败: ${cmd}`);
  };
  run('npm run build:dev');
  run('npm run cp:dev');
};

export default defineConfig((config) => {
  const isBuild = config.command === 'build';
  return {
    server: {
      host: true,
      cors: true,
    },
    html: {
      template: './src/template.html',
    },
    source: {
      preEntry: '@mantou/gem/helper/hmr',
      entry: Object.fromEntries(examples.map((name) => [name, `./src/${name}`])),
      define: {
        'process.env.VERSION': JSON.stringify(version),
        'process.env.EXAMPLES': JSON.stringify(
          examples.map((example) => {
            try {
              return { name: example, ...require(`./src/${example}/manifest.json`), path: example };
            } catch {
              return { path: example, name: example };
            }
          }),
        ),
      },
    },
    tools: {
      rspack: {
        target: ['web', 'es2024'],
        output: {
          devtoolModuleFilenameTemplate: 'webpack://[namespace]/[resource-path]',
        },
        plugins: [
          unpluginGem({
            include: path.resolve(__dirname, 'src'),
            autoImport: {
              extends: 'gem',
              elements: {
                src: {
                  'gem-examples-*': '/elements/*',
                },
              },
            },
            autoImportDts: true,
            hmr: !isBuild,
          }),
        ],
      },
    },
    resolve: {
      alias: {
        src: './src',
        'duoyun-ui/elements': path.resolve(__dirname, '../duoyun-ui/src/elements'),
        'duoyun-ui/patterns': path.resolve(__dirname, '../duoyun-ui/src/patterns'),
        'duoyun-ui/lib': path.resolve(__dirname, '../duoyun-ui/src/lib'),
        'duoyun-ui/helper': path.resolve(__dirname, '../duoyun-ui/src/helper'),
        'tap-ui/elements': path.resolve(__dirname, '../tap-ui/src/elements'),
        'tap-ui/patterns': path.resolve(__dirname, '../tap-ui/src/patterns'),
        'tap-ui/lib': path.resolve(__dirname, '../tap-ui/src/lib'),
      },
    },
    plugins: [
      {
        name: 'ensure-swc-plugin-gem',
        setup(api) {
          api.onBeforeStartDevServer(() => ensureSwcPlugin());
          api.onBeforeStartPreviewServer(() => ensureSwcPlugin());
        },
      },
    ],
  };
});
