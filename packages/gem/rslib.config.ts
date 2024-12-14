// swc 还是谁有 bug，装饰器没有生效
// 例如: https://github.com/swc-project/swc/issues/9565

import path from 'path';

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
          decoratorVersion: '2022-03',
        },
      },
    },
  },
  lib: [{ format: 'esm' }, { format: 'umd' }],
});
