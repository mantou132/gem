import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';

import { createFetchHandler, type Handler, type HandlerOptions, type IsrStore, isQueryRequest } from '../handler';
import type { Renderer } from '../server';

export const getDistPaths = (distDir: string) => ({
  webDir: path.join(distDir, 'web'),
  serverDir: path.join(distDir, 'server'),
  serverEntry: path.join(distDir, 'server', 'index.js'),
  template: path.join(distDir, 'server', 'template.html'),
  /** ISR 的页面，构建时预渲染的结果也在这里 */
  cacheDir: path.join(distDir, 'cache'),
});

export async function loadRenderer(distDir: string) {
  const { serverEntry, template } = getDistPaths(distDir);
  const { default: renderer }: { default: Renderer } = createRequire(import.meta.url)(serverEntry);
  return { renderer, template: await readFile(template, 'utf8') };
}

/** 并行写入文件，不阻塞其他页面的渲染；先写临时文件再改名，ISR 重新渲染时读取的不会是写了一半的文件 */
export function writeFiles(dir: string, files: Map<string, string>) {
  return Promise.all(
    [...files].map(async ([pathname, content]) => {
      const file = path.join(dir, decodeURIComponent(pathname));
      const tmp = `${file}.${crypto.randomUUID()}.tmp`;
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(tmp, content);
      await rename(tmp, file);
    }),
  );
}

/** `dir` 中的文件路径，路径不合法或者不在 `dir` 中时为 `undefined` */
function resolveFile(dir: string, pathname: string) {
  let file: string;
  try {
    file = path.join(dir, decodeURIComponent(pathname));
  } catch {
    // 不合法的 URL 编码，由 SSR 渲染 404 页面
    return;
  }
  if (file.startsWith(dir + path.sep)) return file;
}

/** 没有文件时为 `undefined`，路径中间是文件时（例如 `/a.png/__data.json`）为 `ENOTDIR` */
async function readOptional<T>(read: () => Promise<T>) {
  try {
    return await read();
  } catch (err) {
    const { code } = err as NodeJS.ErrnoException;
    if (code !== 'ENOENT' && code !== 'ENOTDIR') throw err;
  }
}

const readDirFile = (dir: string) => async (pathname: string) => {
  const file = resolveFile(dir, pathname);
  return file && readOptional(() => readFile(file, 'utf8'));
};

/** ISR 的文件存储，写入时间是文件的修改时间 */
function createFsStore(dir: string): IsrStore {
  return {
    async get(pathname) {
      const file = resolveFile(dir, pathname);
      if (!file) return;
      const stats = await readOptional(() => stat(file));
      if (!stats) return;
      const content = await readOptional(() => readFile(file, 'utf8'));
      return content === undefined ? undefined : { content, time: stats.mtimeMs };
    },
    set: (files) => writeFiles(dir, files),
    delete: (files) =>
      Promise.all(
        files.map((pathname) => {
          const file = resolveFile(dir, pathname);
          return file && rm(file, { force: true });
        }),
      ),
  };
}

export interface NodeHandlerOptions extends Pick<HandlerOptions, 'origin'> {
  /** 预渲染的文件目录，优先使用其中的文件 */
  webDir?: string;
  /** ISR 的缓存目录，提供时设置了 `revalidate` 的页面使用 ISR */
  cacheDir?: string;
}

/** Node.js 中的请求处理器，预渲染的文件和 ISR 缓存都在文件系统中 */
export function createRequestHandler(
  renderer: Renderer,
  template: string,
  { webDir, cacheDir, origin }: NodeHandlerOptions = {},
): Handler {
  return createFetchHandler(renderer, template, {
    origin,
    readStatic: webDir ? readDirFile(webDir) : undefined,
    isrStore: cacheDir ? createFsStore(cacheDir) : undefined,
  });
}

/** 从 `dist` 加载服务端产物和 HTML 模版，创建 Node.js 中的请求处理器 */
export async function loadHandler(distDir: string, options?: Pick<HandlerOptions, 'origin'>) {
  const { renderer, template } = await loadRenderer(distDir);
  const { webDir, cacheDir } = getDistPaths(distDir);
  return createRequestHandler(renderer, template, { ...options, webDir, cacheDir });
}

export async function start({
  root = process.cwd(),
  port = Number(process.env.PORT) || 3000,
  origin = process.env.ORIGIN,
} = {}) {
  const distDir = path.join(root, 'dist');
  const handler = await loadHandler(distDir, { origin });
  const app = new Hono();
  const assets = serveStatic({ root: path.relative(process.cwd(), getDistPaths(distDir).webDir) });
  app.use('/*', (ctx, next) => (isQueryRequest(new URL(ctx.req.url)) ? next() : assets(ctx, next)));
  app.all('*', (ctx) => handler(ctx.req.raw));
  serve({ fetch: app.fetch, port }, ({ port }) => console.log(`gemkit: listening on http://localhost:${port}/`));
}
