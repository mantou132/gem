import path from 'node:path';

import { type GemkitAdapter, importPath, writeFile } from '../../plugin/adapter';

/**
 * Cloudflare Workers：输出 Worker 入口 `dist/cloudflare/index.js`，由 Wrangler 打包，
 * `wrangler.jsonc` 中 `main` 是这个文件，`assets.directory` 是 `dist/web`；
 * ISR 使用绑定的 `GEMKIT_CACHE` KV
 */
export function cloudflare(): GemkitAdapter {
  return {
    name: 'cloudflare',
    runtime: '@mantou/gemkit/adapters/cloudflare',
    write({ distDir, handlerFile, template }) {
      const outDir = path.join(distDir, 'cloudflare');
      writeFile(
        path.join(outDir, 'index.js'),
        `import { createHandler } from ${importPath(outDir, handlerFile)};\n\n` +
          `export default createHandler(${JSON.stringify(template)});\n`,
      );
    },
  };
}
