import { resolve } from 'path';
import fs from 'fs';

import { defineConfig } from 'vite';

const examples = (fs.readdirSync('src') as string[]).filter(
  (example) => example !== 'elements' && example !== 'index.html',
);

export default defineConfig({
  root: 'src',
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, `src/index.html`),
        ...Object.fromEntries(examples.map((name) => [name, resolve(__dirname, `src/${name}/index.html`)])),
      },
    },
    outDir: resolve(process.cwd(), 'dist'),
    emptyOutDir: true,
    sourcemap: true,
  },
  define: {
    'process.env.METADATA': JSON.stringify(
      Object.fromEntries(
        examples.map((example) => {
          try {
            return [example, require(`./src/${example}/manifest.json`)];
          } catch {
            return [example, {}];
          }
        }),
      ),
    ),
    'process.env.EXAMPLES': JSON.stringify(examples),
    'process.env.EXAMPLE': JSON.stringify('index'),
    'process.env.FILES': JSON.stringify([]),
    'process.env.TAEGET': JSON.stringify('pages'),
  },
  resolve: {
    alias: {
      src: '',
    },
  },
});
