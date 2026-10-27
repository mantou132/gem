import fs from 'node:fs';
import path from 'node:path';

import { type GemkitAdapter, importPath, writeFile } from '../../plugin/adapter';

/**
 * Cloudflare Workers：输出 Worker 入口 `dist/cloudflare/index.js`，由 Wrangler 打包，
 * `wrangler.jsonc` 中 `main` 是这个文件，`assets.directory` 是 `dist/web`；
 * ISR 使用绑定的 `GEMKIT_CACHE` KV
 *
 * `src/worker.ts` 的导出合并到 Worker 入口：默认导出的处理函数（例如 `scheduled`、`queue`）合并到默认导出，
 * `fetch` 由 Gemkit 处理；其他导出（例如 Durable Object、Workflow 类）原样导出。
 * 它由 Wrangler 打包，不经过 Rsbuild，可以导入 `cloudflare:workers`
 */
export function cloudflare(): GemkitAdapter {
  return {
    name: 'cloudflare',
    runtime: '@mantou/gemkit/adapters/cloudflare',
    write({ srcDir, distDir, handlerFile, template }) {
      const outDir = path.join(distDir, 'cloudflare');
      const workerFile = fs.readdirSync(srcDir).find((file) => /^worker\.[cm]?[jt]s$/.test(file));
      const worker = workerFile && importPath(outDir, path.join(srcDir, workerFile));
      const handler = `createHandler(${JSON.stringify(template)})`;
      writeFile(
        path.join(outDir, 'index.js'),
        `import { createHandler } from ${importPath(outDir, handlerFile)};\n` +
          (worker
            ? `import * as worker from ${worker};\n\n` +
              `export * from ${worker};\n\n` +
              `export default { ...worker.default, fetch: ${handler}.fetch };\n`
            : `\nexport default ${handler};\n`),
      );
    },
  };
}
