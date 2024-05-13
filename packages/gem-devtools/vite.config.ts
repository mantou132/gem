import { resolve } from 'path';

import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  publicDir: resolve(process.cwd(), 'public'),
  esbuild: {
    target: 'es2022',
  },
  build: {
    assetsInlineLimit: 0,
    polyfillModulePreload: false,
    target: 'es2020',
    rollupOptions: {
      input: {
        test: resolve(__dirname, 'src/test.html'),
        sidebarpanel: resolve(__dirname, 'src/sidebarpanel.html'),
        devtools: resolve(__dirname, 'src/devtools.html'),
        // not support module
        content: resolve(__dirname, 'src/content.ts'),
      },
      output: {
        assetFileNames: '[name].[ext]',
        chunkFileNames(info) {
          return info.name + '.js';
        },
        entryFileNames(info) {
          return info.name + '.js';
        },
        manualChunks: {
          gem: ['@mantou/gem'],
        },
      },
    },
    outDir: resolve(process.cwd(), 'extension'),
    emptyOutDir: false,
    sourcemap: true,
    minify: false,
  },
  resolve: {
    alias: {
      src: '',
    },
  },
});
