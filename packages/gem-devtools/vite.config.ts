import { resolve } from 'path';

import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  publicDir: resolve(process.cwd(), 'public'),
  build: {
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
    brotliSize: false,
    minify: false,
  },
  resolve: {
    alias: {
      src: '',
    },
  },
});
