// swc 还是谁有 bug，装饰器没有生效

import fs from 'fs';

import { defineConfig } from '@rsbuild/core';

import { version } from '../gem/package.json';

const examples = fs
  .readdirSync('src', { withFileTypes: true })
  .filter((example) => example.isDirectory() && example.name !== 'elements')
  .map((dir) => dir.name);

export default defineConfig((config) => {
  const isBuild = config.command === 'build';
  return {
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
        target: ['web', 'es2022'],
      },
      swc: {
        jsc: {
          parser: {
            syntax: 'typescript',
            decorators: true,
          },
          transform: {
            decoratorVersion: '2022-03',
          },
          experimental: {
            runPluginFirst: true,
            plugins: isBuild
              ? []
              : [
                  [
                    '../../crates/swc-plugin-gem/swc_plugin_gem.wasm',
                    {
                      hmr: true,
                    },
                  ],
                ],
          },
        },
      },
    },
    resolve: {
      alias: {
        src: '',
      },
    },
  };
});
