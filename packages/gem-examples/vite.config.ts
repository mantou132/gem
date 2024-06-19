import fs from 'fs';

import { defineConfig } from 'vite';
import { createMpaPlugin, createPages } from 'vite-plugin-virtual-mpa';

import { version } from '../gem/package.json';

const examples = (fs.readdirSync('src') as string[]).filter(
  (example) => example !== 'elements' && !example.endsWith('.html') && !example.startsWith('.'),
);

export default defineConfig({
  build: {
    emptyOutDir: true,
    sourcemap: true,
  },
  esbuild: {
    target: 'es2022',
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
    'process.env.VERSION': JSON.stringify(version),
    'process.env.EXAMPLES': JSON.stringify(
      examples.map((example) => {
        try {
          return { name: example, ...require(`./src/${example}/manifest.json`) };
        } catch {
          return { name: example };
        }
      }),
    ),
  },
  resolve: {
    alias: {
      src: '',
    },
  },
});
