import { resolve } from 'path';

import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  publicDir: resolve(process.cwd(), 'public'),
  build: {
    rollupOptions: {
      input: {
        test: resolve(__dirname, 'src/test.html'),
        sidebarpanel: resolve(__dirname, 'src/sidebarpanel.html'),
        devtools: resolve(__dirname, 'src/devtools.html'),
        content: resolve(__dirname, 'src/content.ts'),
      },
      output: {
        entryFileNames(info) {
          return info.name + '.js';
        },
      },
    },
    outDir: resolve(process.cwd(), 'extension'),
    emptyOutDir: true,
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
