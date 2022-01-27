import path from 'path';

import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/dist.ts'),
      name: 'Gem',
      fileName: (format) => `gem.${format}.js`,
    },
  },
});
