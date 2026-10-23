import fs from 'node:fs';
import path from 'node:path';

import { ELEMENTS_FILE, escapeHtml, getDataPath } from '../constants';
import type { DataFile } from '../data';
import type { Renderer } from '../server';

function getRedirectHtml(location: string) {
  const url = escapeHtml(location);
  return `<!doctype html><meta charset="utf-8"><title>Redirecting</title><meta http-equiv="refresh" content="0; url=${url}"><link rel="canonical" href="${url}">\n`;
}

/**
 * 预渲染页面，返回状态码和需要写入的文件（路径和内容），构建时和 ISR 使用
 *
 * 静态托管不能响应跳转，页面使用 `<meta>` 跳转，客户端导航时从数据文件中读取跳转地址
 */
export async function prerenderPage(renderer: Renderer, template: string, pathname: string) {
  const serverElements = new Map<string, string>();
  const result = await renderer.renderDocument(template, pathname, { serverElements });
  const files = new Map<string, string>();
  const location = result.headers.get('location');
  if (location) {
    files.set(path.posix.join(pathname, 'index.html'), getRedirectHtml(location));
    files.set(getDataPath(pathname), JSON.stringify({ redirect: location } satisfies DataFile));
    return { status: result.status, files };
  }
  files.set(path.posix.join(pathname, 'index.html'), (await Array.fromAsync(result.html)).join(''));
  // 客户端导航时使用的纯服务端元素，导航时总会请求，没有元素时也输出
  files.set(getDataPath(pathname, ELEMENTS_FILE), JSON.stringify(Object.fromEntries(serverElements)));
  // 客户端导航时使用的数据
  if (renderer.hasServerData(pathname)) {
    const dataPath = getDataPath(pathname);
    files.set(dataPath, JSON.stringify((await renderer.loadData(dataPath)).body));
  }
  return { status: result.status, files };
}

/** 并行写入文件，不阻塞其他页面的渲染；先写临时文件再改名，ISR 重新渲染时读取的不会是写了一半的文件 */
export function writeFiles(dir: string, files: Map<string, string>) {
  return Promise.all(
    [...files].map(async ([pathname, content]) => {
      const file = path.join(dir, decodeURIComponent(pathname));
      const tmp = `${file}.${crypto.randomUUID()}.tmp`;
      await fs.promises.mkdir(path.dirname(file), { recursive: true });
      await fs.promises.writeFile(tmp, content);
      await fs.promises.rename(tmp, file);
    }),
  );
}
