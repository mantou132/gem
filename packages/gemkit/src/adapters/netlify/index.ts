import path from 'node:path';

import { type GemkitAdapter, importPath, writeFile } from '../../plugin/adapter';

/**
 * Netlify：输出 `.netlify/v1/functions` 中的函数，`netlify.toml` 中 `publish` 是 `dist/web`，
 * ISR 使用 Netlify 的持久 CDN 缓存
 */
export function netlify(): GemkitAdapter {
  return {
    name: 'netlify',
    runtime: '@mantou/gemkit/adapters/netlify',
    write({ rootPath, handlerFile, template }) {
      const functionsDir = path.join(rootPath, '.netlify/v1/functions');
      writeFile(
        path.join(functionsDir, 'gemkit.mjs'),
        `import { createHandler } from ${importPath(functionsDir, handlerFile)};\n\n` +
          `export default createHandler(${JSON.stringify(template)});\n\n` +
          `export const config = { path: '/*', preferStatic: true };\n`,
      );
    },
  };
}
