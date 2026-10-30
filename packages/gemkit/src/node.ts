import { createReadStream, type Stats } from 'node:fs';
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { Duplex, Readable } from 'node:stream';
import { promisify } from 'node:util';
import zlib from 'node:zlib';

import { serve as serveNode } from '@hono/node-server';
import { getMimeType } from 'hono/utils/mime';

import { trimTrailingSlash } from './constants';
import type { Platform } from './data';
import {
  createFetchHandler,
  createNodePlatform,
  type Handler,
  type HandlerOptions,
  type IsrStore,
  isQueryRequest,
} from './handler';
import type { Renderer } from './server';

export type { IsrStore };

// `waitUntil` 中还没有完成的后台任务，关闭服务器时等待它们完成
const tasks = new Set<Promise<unknown>>();

/** 开发服务器和 Node.js 服务器的平台上下文，进程在响应后不会退出，后台任务只需要记录错误 */
export const nodePlatform: Platform = createNodePlatform({
  waitUntil: (promise) => {
    const task = promise.catch((err) => console.error(err)).finally(() => tasks.delete(task));
    tasks.add(task);
  },
});

/** 等待后台任务完成，任务中可能添加新的任务 */
async function drain() {
  while (tasks.size) await Promise.all(tasks);
}

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
  const { default: renderer }: { default: Renderer } = createRequire(serverEntry)(serverEntry);
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
export function createFsStore(dir: string): IsrStore {
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

export interface NodeHandlerOptions extends Pick<HandlerOptions, 'origin' | 'isrStore'> {
  /** 预渲染的文件目录，优先使用其中的文件 */
  webDir?: string;
}

/** Node.js 中的请求处理器，开发服务器和 `rsbuild preview` 使用，静态文件由 Rsbuild 提供 */
export function createRequestHandler(
  renderer: Renderer,
  template: string,
  { webDir, ...options }: NodeHandlerOptions = {},
): Handler {
  return createFetchHandler(renderer, template, { ...options, readStatic: webDir ? readDirFile(webDir) : undefined });
}

/** 从 `dist` 加载服务端产物和 HTML 模版，创建 Node.js 中的请求处理器 */
export async function loadHandler(distDir: string) {
  const { renderer, template } = await loadRenderer(distDir);
  const { webDir, cacheDir } = getDistPaths(distDir);
  return createRequestHandler(renderer, template, { webDir, isrStore: createFsStore(cacheDir) });
}

// 文本类的内容压缩效果好，图片、字体等已经压缩过
const COMPRESSIBLE_TYPE = /^(?:text\/|application\/(?:[\w.-]+\+)?(?:json|javascript|xml)|image\/svg\+xml)/i;

// 太小的内容压缩后几乎不会变小
const MIN_COMPRESS_SIZE = 1024;

/** 浏览器支持的压缩格式，`br` 优先 */
function getEncodings(request: Request) {
  const accepted = (request.headers.get('accept-encoding') || '').split(',').flatMap((item) => {
    const [name, ...params] = item.split(';').map((part) => part.trim());
    return params.some((param) => /^q=0(?:\.0*)?$/.test(param)) ? [] : [name];
  });
  return (['br', 'gzip'] as const).filter((encoding) => accepted.includes(encoding));
}

const PRECOMPRESSED = { br: '.br', gzip: '.gz' };

/** `/static/` 中是 Rsbuild 输出的带 hash 的文件，内容不会变化 */
const IMMUTABLE = 'public, max-age=31536000, immutable';

type Encoding = keyof typeof PRECOMPRESSED;

/** 文件的路径和缓存验证需要的信息 */
interface StaticFile {
  file: string;
  size: number;
  etag: string;
  lastModified: string;
}

interface StaticEntry extends StaticFile {
  type: string;
  cacheControl: string;
  compressible: boolean;
  /** 构建时压缩的文件 */
  encoded: Partial<Record<Encoding, StaticFile>>;
}

// 小文件一次读取，比流快
const STREAM_SIZE = 1024 * 1024;

const toStaticFile = (file: string, stats: Stats): StaticFile => ({
  file,
  size: stats.size,
  etag: `W/"${stats.size.toString(36)}-${Math.trunc(stats.mtimeMs).toString(36)}"`,
  lastModified: stats.mtime.toUTCString(),
});

/**
 * `dir` 中的文件，构建后不会变化，启动时读取一次，请求时不需要访问文件系统；
 * key 是请求的路径，目录（预渲染的页面）使用其中的 `index.html`，构建时压缩的文件属于原文件
 */
async function indexFiles(dir: string) {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  const files = await Promise.all(
    entries.flatMap((entry) => {
      if (!entry.isFile()) return [];
      const file = path.join(entry.parentPath, entry.name);
      return [stat(file).then((stats) => toStaticFile(file, stats))];
    }),
  );
  const index = new Map<string, StaticEntry>();
  const encoded: [Encoding, StaticFile][] = [];
  for (const item of files) {
    const encoding = (Object.keys(PRECOMPRESSED) as Encoding[]).find((e) => item.file.endsWith(PRECOMPRESSED[e]));
    if (encoding) {
      encoded.push([encoding, item]);
      continue;
    }
    const pathname = `/${path.relative(dir, item.file).split(path.sep).join('/')}`;
    const type = getMimeType(item.file) || 'application/octet-stream';
    const entry: StaticEntry = {
      ...item,
      type,
      cacheControl: pathname.startsWith('/static/') ? IMMUTABLE : 'no-cache',
      compressible: COMPRESSIBLE_TYPE.test(type),
      encoded: {},
    };
    index.set(pathname, entry);
    if (pathname.endsWith('/index.html')) index.set(pathname.slice(0, -'/index.html'.length) || '/', entry);
  }
  const byFile = new Map([...index.values()].map((entry) => [entry.file, entry]));
  for (const [encoding, item] of encoded) {
    const entry = byFile.get(item.file.slice(0, -PRECOMPRESSED[encoding].length));
    if (entry?.compressible) entry.encoded[encoding] = item;
  }
  return index;
}

/**
 * 提供 `dir` 中的文件，没有时为 `undefined`，优先使用构建时压缩的文件，
 * 带 hash 的文件长期缓存，其他文件每次使用 ETag 验证
 */
async function createStaticHandler(dir: string) {
  const index = await indexFiles(dir);
  return async (request: Request, { pathname }: URL): Promise<Response | undefined> => {
    if (request.method !== 'GET' && request.method !== 'HEAD') return;
    let key: string;
    try {
      key = trimTrailingSlash(decodeURIComponent(pathname));
    } catch {
      // 不合法的 URL 编码，由 SSR 渲染 404 页面
      return;
    }
    const entry = index.get(key);
    if (!entry) return;
    const headers = new Headers({ 'content-type': entry.type, 'cache-control': entry.cacheControl });
    let target: StaticFile = entry;
    if (entry.compressible) {
      headers.set('vary', 'Accept-Encoding');
      const encoding = getEncodings(request).find((e) => entry.encoded[e]);
      if (encoding) {
        target = entry.encoded[encoding]!;
        headers.set('content-encoding', encoding);
      }
    }
    headers.set('etag', target.etag);
    headers.set('last-modified', target.lastModified);
    const match = request.headers.get('if-none-match');
    if (match?.split(',').some((value) => value.trim() === target.etag)) {
      return new Response(null, { status: 304, headers });
    }
    const { file, size } = target;
    const stream = (start?: number, end?: number) =>
      Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream;
    const head = request.method === 'HEAD';
    // 视频需要分段请求，例如 Safari
    const range = target === entry && /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') || '');
    if (target === entry) headers.set('accept-ranges', 'bytes');
    if (range) {
      const start = range[1] ? Number(range[1]) : Math.max(size - Number(range[2]), 0);
      const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
      if (start > end) return new Response(null, { status: 416, headers: { 'content-range': `bytes */${size}` } });
      headers.set('content-range', `bytes ${start}-${end}/${size}`);
      headers.set('content-length', String(end - start + 1));
      return new Response(head ? null : stream(start, end), { status: 206, headers });
    }
    if (head || size > STREAM_SIZE) {
      headers.set('content-length', String(size));
      return new Response(head ? null : stream(), { headers });
    }
    // 运行时会设置内容的 `Content-Length`，重复设置时有的客户端会拒绝响应
    return new Response(new Uint8Array(await readFile(file)), { headers });
  };
}

/**
 * 压缩动态响应（页面、数据、API 路由），每次写入后立即输出，流式输出的页面不会被压缩缓冲；
 * 实时压缩占用渲染的 CPU，使用快速的等级：brotli 2 比 gzip 6 快一倍，结果还小约 20%，
 * gzip 1 和 gzip 6 的结果大小几乎相同
 */
function compressResponse(request: Request, response: Response) {
  const { headers, body, status } = response;
  if (!body || status !== 200 || headers.has('content-encoding') || request.method === 'HEAD') return response;
  if (!COMPRESSIBLE_TYPE.test(headers.get('content-type') || '')) return response;
  if (/\bno-transform\b/.test(headers.get('cache-control') || '')) return response;
  const length = headers.get('content-length');
  if (length && Number(length) < MIN_COMPRESS_SIZE) return response;
  const [encoding] = getEncodings(request);
  if (!encoding) return response;
  const { constants } = zlib;
  const stream =
    encoding === 'br'
      ? zlib.createBrotliCompress({
          flush: constants.BROTLI_OPERATION_FLUSH,
          params: { [constants.BROTLI_PARAM_QUALITY]: 2, [constants.BROTLI_PARAM_LGWIN]: 18 },
        })
      : zlib.createGzip({ flush: constants.Z_SYNC_FLUSH, level: 1 });
  const transform = Duplex.toWeb(stream) as unknown as ReadableWritablePair<Uint8Array, Uint8Array>;
  const result = new Response(body.pipeThrough(transform), response);
  result.headers.set('content-encoding', encoding);
  result.headers.append('vary', 'Accept-Encoding');
  result.headers.delete('content-length');
  return result;
}

const PRECOMPRESS_CONCURRENCY = 8;

const brotli = promisify(zlib.brotliCompress);
const gzip = promisify(zlib.gzip);

/**
 * brotli 的最高等级比 5 慢约 200 倍，结果只小 10% 以内：
 * `/static/` 中带 hash 的文件不多，长期缓存，使用最高等级；预渲染的页面可能很多，使用 5
 */
const PAGE_BROTLI_QUALITY = 5;

/**
 * 构建时压缩 `dir` 中的文本文件（客户端资源和预渲染的页面），
 * 写入 `.br` 和 `.gz` 文件，Node.js 服务器直接提供，不需要实时压缩
 */
export async function precompress(dir: string) {
  const staticDir = path.join(dir, 'static') + path.sep;
  const files = (await readdir(dir, { recursive: true, withFileTypes: true })).flatMap((entry) => {
    const file = path.join(entry.parentPath, entry.name);
    return entry.isFile() && COMPRESSIBLE_TYPE.test(getMimeType(file) || '') ? [file] : [];
  });
  await Promise.all(
    Array.from({ length: PRECOMPRESS_CONCURRENCY }, async () => {
      for (let file = files.shift(); file !== undefined; file = files.shift()) {
        const content = await readFile(file);
        if (content.length < MIN_COMPRESS_SIZE) continue;
        const { constants } = zlib;
        await Promise.all([
          brotli(content, {
            params: {
              [constants.BROTLI_PARAM_QUALITY]: file.startsWith(staticDir)
                ? constants.BROTLI_MAX_QUALITY
                : PAGE_BROTLI_QUALITY,
              [constants.BROTLI_PARAM_SIZE_HINT]: content.length,
            },
          }).then((data) => writeFile(file + PRECOMPRESSED.br, data)),
          gzip(content, { level: constants.Z_BEST_COMPRESSION }).then((data) =>
            writeFile(file + PRECOMPRESSED.gzip, data),
          ),
        ]);
      }
    }),
  );
}

export interface AppOptions extends Pick<HandlerOptions, 'origin'> {
  /**
   * 包含 `dist` 的项目根目录
   * @default process.cwd()
   */
  root?: string;
  /** 设置了 `revalidate` 的页面的存储，默认是 `dist/cache` 中的文件，多个实例时使用共享的存储，例如 Redis */
  isrStore?: IsrStore;
  /**
   * 实时压缩动态响应（页面、数据、API 路由），会占用渲染的 CPU，
   * 部署在会压缩的 CDN 或反向代理后面时可以关闭；构建时压缩的静态文件总会使用
   * @default true
   */
  compress?: boolean;
}

export interface App {
  /** 处理请求：`dist/web` 中的文件（包括预渲染的页面），其他请求由服务端渲染，默认压缩响应 */
  fetch: (request: Request) => Promise<Response>;
  /** 等待 `waitUntil` 的后台任务（例如 ISR 重新渲染）完成，关闭服务器时使用 */
  drain: () => Promise<void>;
}

/**
 * 加载构建产物，创建 Node.js 中的应用，自定义服务器时使用，例如添加 WebSocket
 *
 * @example
 * ```ts
 * import { getRequestListener } from '@hono/node-server';
 * import { createApp } from '@mantou/gemkit/node';
 *
 * const app = await createApp();
 * const server = http.createServer(getRequestListener(app.fetch));
 * ```
 */
export async function createApp({
  root = process.cwd(),
  origin,
  isrStore,
  compress = true,
}: AppOptions = {}): Promise<App> {
  const distDir = path.join(root, 'dist');
  const { renderer, template } = await loadRenderer(distDir);
  const { webDir, cacheDir } = getDistPaths(distDir);
  const handler = createFetchHandler(renderer, template, { origin, isrStore: isrStore || createFsStore(cacheDir) });
  const serveFile = await createStaticHandler(webDir);
  return {
    async fetch(request) {
      const url = new URL(request.url);
      // 带查询参数的页面和数据请求不使用预渲染的文件
      const file = isQueryRequest(url) ? undefined : await serveFile(request, url);
      if (file) return file;
      const response = await handler(request, nodePlatform);
      return compress ? compressResponse(request, response) : response;
    },
    drain,
  };
}

// 关闭服务器时等待请求和后台任务完成的最长时间
const SHUTDOWN_TIMEOUT = 30_000;

export interface StartOptions extends AppOptions {
  /** 默认读取环境变量 `PORT`，没有时为 `3000` */
  port?: number;
  /** 监听的地址，默认读取环境变量 `HOST`，没有时监听所有地址 */
  host?: string;
}

/**
 * `gemkit start`：启动 Node.js 服务器，收到 `SIGTERM` 或 `SIGINT` 时不再接受新连接，
 * 等待进行中的请求和后台任务完成，超时后关闭所有连接；
 * 进程在没有其他任务（例如应用打开的数据库连接）时退出
 */
export async function start({
  port = Number(process.env.PORT) || 3000,
  host = process.env.HOST,
  origin = process.env.ORIGIN,
  ...options
}: StartOptions = {}) {
  const app = await createApp({ origin, ...options });
  const server = serveNode({ fetch: app.fetch, port, hostname: host }, (info) =>
    console.log(`gemkit: listening on http://${host || 'localhost'}:${info.port}/`),
  );
  const shutdown = async () => {
    console.log('gemkit: shutting down');
    setTimeout(() => 'closeAllConnections' in server && server.closeAllConnections(), SHUTDOWN_TIMEOUT).unref();
    await new Promise((resolve) => server.close(resolve));
    await app.drain();
  };
  // 只处理一次，再次按下 Ctrl+C 时立即退出
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
  return server;
}
