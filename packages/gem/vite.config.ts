import path from 'node:path';

import { defineConfig } from 'vite';

export default defineConfig({
  esbuild: {
    target: 'es2022',
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/dist.ts'),
      name: 'Gem',
      fileName: (format) => `gem.${format}.js`,
    },
  },
});
