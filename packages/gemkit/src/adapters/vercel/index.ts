import fs from 'node:fs';
import path from 'node:path';

import { type GemkitAdapter, writeFile } from '../../plugin/adapter';

/**
 * Vercel：输出 Build Output API 的 `.vercel/output`，函数使用 Node.js 运行时，
 * ISR 使用 Vercel 的 CDN 缓存
 */
export function vercel(): GemkitAdapter {
  return {
    name: 'vercel',
    runtime: '@mantou/gemkit/adapters/vercel',
    write({ rootPath, webDir, serverDir, template }) {
      const outputDir = path.join(rootPath, '.vercel/output');
      const funcDir = path.join(outputDir, 'functions/__gemkit.func');
      fs.rmSync(outputDir, { recursive: true, force: true });
      fs.cpSync(webDir, path.join(outputDir, 'static'), { recursive: true });
      // 函数入口是一个文件，不需要预渲染使用的其他产物
      fs.mkdirSync(funcDir, { recursive: true });
      for (const file of ['handler.js', 'package.json'])
        fs.copyFileSync(path.join(serverDir, file), path.join(funcDir, file));
      writeFile(
        path.join(funcDir, 'entry.js'),
        `module.exports = require('./handler.js').createHandler(${JSON.stringify(template)});\n`,
      );
      writeFile(
        path.join(funcDir, '.vc-config.json'),
        JSON.stringify({
          runtime: 'nodejs22.x',
          handler: 'entry.js',
          launcherType: 'Nodejs',
          supportsResponseStreaming: true,
        }),
      );
      writeFile(
        path.join(outputDir, 'config.json'),
        JSON.stringify({ version: 3, routes: [{ handle: 'filesystem' }, { src: '/.*', dest: '/__gemkit' }] }),
      );
    },
  };
}
