import { defineConfig } from '@rsbuild/core';

export default defineConfig(() => ({
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
  // rsbuild 2.0: `performance.chunkSplit` 改名为顶层 `splitChunks`
  splitChunks: {},
  resolve: {
    alias: {
      src: '',
    },
  },
}));
