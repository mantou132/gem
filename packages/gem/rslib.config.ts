import path from 'node:path';

import { defineConfig } from '@rslib/core';

export default defineConfig({
  output: {
    minify: true,
    legalComments: 'none',
  },
  source: {
    entry: { gem: path.resolve(__dirname, 'src/dist.ts') },
  },
  tools: {
    swc: {
      jsc: {
        transform: {
          decoratorMetadata: true,
          decoratorVersion: '2023-11',
        },
      },
    },
  },
  lib: [
    { format: 'esm' },
    {
      format: 'umd',
      umdName: 'Gem',
      tools: {
        rspack: {
          output: {
            globalObject: 'globalThis',
          },
        },
      },
    },
  ],
});
