// swc 还是谁有 bug，装饰器没有生效

import { defineConfig } from '@rsbuild/core';

export default defineConfig(({}) => ({
  html: {
    template: './src/template.html',
  },
  source: {
    // 触发更新
    preEntry: './src/manifest.json',
    entry: {
      test: './src/test.ts',
      sidebarpanel: './src/sidebarpanel.ts',
      devtools: './src/devtools.ts',
      // not support module
      content: {
        import: './src/content.ts',
        html: false,
      },
    },
  },
  output: {
    copy: [{ from: './src/manifest.json' }],
    distPath: {
      root: 'extension',
      js: '.',
    },
    filename: {
      js: '[name].js',
    },
    dataUriLimit: 0,
    sourceMap: true,
  },
  performance: {
    chunkSplit: {},
  },
  resolve: {
    alias: {
      src: '',
    },
  },
}));
