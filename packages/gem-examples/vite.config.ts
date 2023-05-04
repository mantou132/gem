// Wait: https://github.com/evanw/esbuild/issues/104
// update .html entry, package scripts

import fs from 'fs';

import { defineConfig } from 'vite';
import { createMpaPlugin, createPages } from 'vite-plugin-virtual-mpa';

const examples = (fs.readdirSync('src') as string[]).filter(
  (example) => example !== 'elements' && !example.endsWith('.html') && !example.startsWith('.'),
);

export default defineConfig({
  build: {
    emptyOutDir: true,
    sourcemap: true,
  },
  plugins: [
    createMpaPlugin({
      template: 'src/template.html',
      pages: createPages(
        examples.map((name) => ({
          name,
          entry: `/src/${name}/index.ts`,
        })),
      ),
      rewrites: [{ from: /^\/$/, to: '/index.html' }],
    }),
  ],
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
    'process.env.TARGET': JSON.stringify('pages'),
  },
  resolve: {
    alias: {
      src: '',
    },
  },
});
