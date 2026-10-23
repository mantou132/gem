import { readFile, rm, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';

import { DATA_FILE, ELEMENT_PATH, ELEMENTS_FILE, getDataPath, trimTrailingSlash } from '../constants';
import type { RouteError } from '../data';
import type { Renderer } from '../server';
import { prerenderPage, writeFiles } from './prerender';

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

/** 页面数据和页面中纯服务端元素的请求 */
export const isDataRequest = (pathname: string) =>
  pathname.endsWith(`/${DATA_FILE}`) || pathname.endsWith(`/${ELEMENTS_FILE}`);

/**
 * 带查询参数的页面和数据请求不使用预渲染的文件，`load` 的结果可能和预渲染时不同，
 * 例如读取了 `url.searchParams`；其他文件（例如 `app.js?v=1`）不受影响
 */
const isQueryRequest = ({ pathname, search }: URL) => !!search && (isDataRequest(pathname) || !path.extname(pathname));

/** 表单提交到页面的 `actions`，地址是 `<page path>?/<name>` */
export const isActionRequest = (method: string, search: string) => method === 'POST' && search.startsWith('?/');

export type Handler = ((request: Request) => Promise<Response>) & {
  /** 路径匹配 API 路由，开发服务器用来判断是否处理请求 */
  isEndpoint: (pathname: string) => boolean;
};

/** 浏览器可以跨站直接提交（不需要预检）的请求体类型，API 路由拒绝这些跨站请求 */
const FORM_TYPES = ['application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain'];

const isFormRequest = (request: Request) => {
  if (request.method === 'GET' || request.method === 'HEAD') return false;
  const type = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  return !!type && FORM_TYPES.includes(type);
};

const HTML_TYPE = 'text/html; charset=utf-8';

const encoder = new TextEncoder();

/** 流式输出 HTML，直接编码，`TextEncoderStream` 多一层 TransformStream 开销较大 */
const toStream = (html: AsyncIterator<string>) =>
  new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await html.next();
      if (done) controller.close();
      else controller.enqueue(encoder.encode(value));
    },
  });

/**
 * 其他网站提交的表单或者纯服务端元素的请求（CSRF），优先使用浏览器的 `Sec-Fetch-Site`，
 * 反向代理后请求 URL 的协议可能和浏览器中的不同，所以只比较 `Origin` 的 host
 */
function isCrossSite(request: Request, url: URL) {
  const site = request.headers.get('sec-fetch-site');
  if (site) return site !== 'same-origin';
  const origin = request.headers.get('origin');
  return !!origin && new URL(origin).host !== url.host;
}

/** 请求的 `Host` 请求头和连接的协议不可信，例如反向代理后面的协议总是 `http:`，使用配置的 origin */
function withOrigin(request: Request, origin: string) {
  const { pathname, search } = new URL(request.url);
  return new Request(`${origin}${pathname}${search}`, request);
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

/** 请求的页面路径和对应的文件，例如 `/blog/__data.json` 是 `/blog` 和 `/blog/__data.json` */
function getPageFile(pathname: string) {
  if (!isDataRequest(pathname)) {
    const page = trimTrailingSlash(pathname);
    return { page, file: path.posix.join(page, 'index.html') };
  }
  return { page: pathname.slice(0, pathname.lastIndexOf('/')) || '/', file: pathname };
}

/**
 * 增量静态再生成（ISR）：设置了 `revalidate` 的页面第一次请求时预渲染并写到 `cacheDir`，
 * 过期后先返回旧内容，在后台重新渲染，同一个页面同时只渲染一次；
 * 和预渲染的条件一样，渲染结果不是 200 时（例如跳转、出错）不缓存，由服务端渲染
 */
function createIsr(renderer: Renderer, template: string, cacheDir: string) {
  const pending = new Map<string, Promise<boolean>>();
  const regenerate = (page: string) => {
    let promise = pending.get(page);
    if (!promise) {
      promise = (async () => {
        const { status, files } = await prerenderPage(renderer, template, page);
        if (status !== 200) return false;
        await writeFiles(cacheDir, files);
        return true;
      })().finally(() => pending.delete(page));
      pending.set(page, promise);
    }
    return promise;
  };
  renderer.setRevalidateHandler((page) =>
    Promise.all(
      [path.posix.join(page, 'index.html'), getDataPath(page), getDataPath(page, ELEMENTS_FILE)].map((pathname) => {
        const file = resolveFile(cacheDir, pathname);
        return file && rm(file, { force: true });
      }),
    ),
  );
  /** 页面或者数据文件的内容，页面不使用 ISR 或者不能缓存时为 `undefined` */
  return async (pathname: string) => {
    const { page, file: filePath } = getPageFile(pathname);
    const file = resolveFile(cacheDir, filePath);
    if (!file) return;
    const revalidate = await renderer.getRevalidate(page);
    if (revalidate === undefined) return;
    const stats = await readOptional(() => stat(file));
    if (!stats) {
      // 渲染出错时由服务端渲染错误页面，并交给 `handleError`
      if (!(await renderer.canPrerender(page)) || !(await regenerate(page).catch(() => false))) return;
      return readOptional(() => readFile(file, 'utf8'));
    }
    // 先读取旧内容再在后台重新渲染
    const content = await readOptional(() => readFile(file, 'utf8'));
    if (Date.now() - stats.mtimeMs > revalidate * 1000) regenerate(page).catch((err) => console.error(err));
    return content;
  };
}

export interface HandlerOptions {
  /** 预渲染的文件目录，优先使用其中的文件 */
  webDir?: string;
  /** ISR 的缓存目录，提供时设置了 `revalidate` 的页面使用 ISR */
  cacheDir?: string;
  /**
   * 网站的 origin，例如 `https://example.com`，部署在反向代理后面时设置，
   * 否则使用 `Host` 请求头和连接的协议，`load` 中的 `url`、cookie 的 `Secure` 和同源检查都使用它
   */
  origin?: string;
}

/** 处理页面、页面数据、表单提交、纯服务端元素和 API 路由请求，提供 `webDir` 时优先使用预渲染的文件 */
export function createRequestHandler(
  renderer: Renderer,
  template: string,
  { webDir, cacheDir, origin }: HandlerOptions = {},
): Handler {
  const trustedOrigin = origin && new URL(origin).origin;
  const readIsr = cacheDir ? createIsr(renderer, template, cacheDir) : undefined;
  // 带查询参数的请求不使用预渲染和 ISR 的文件
  const readPrerendered = async (url: URL) => {
    if (isQueryRequest(url)) return;
    const file = webDir && resolveFile(webDir, getPageFile(url.pathname).file);
    return (file && (await readOptional(() => readFile(file, 'utf8')))) || readIsr?.(url.pathname);
  };
  const renderHtml = async (request: Request, error?: RouteError) => {
    const { status, headers, html } = await renderer.renderDocument(template, request, { error });
    headers.set('content-type', HTML_TYPE);
    return new Response(toStream(html), { status, headers });
  };
  const handler = async (input: Request) => {
    const request = trustedOrigin ? withOrigin(input, trustedOrigin) : input;
    const url = new URL(request.url);
    const { pathname } = url;
    if (pathname === ELEMENT_PATH) {
      if (isCrossSite(request, url)) return new Response(null, { status: 403 });
      const { status, headers, html } = await renderer.renderElements(request);
      return Response.json(html, { status, headers });
    }
    if (renderer.matchEndpoint(pathname)) {
      // 跨站的 JSON 请求需要预检，由 CORS 限制，没有 `Origin` 的请求（例如 webhook）不受影响
      if (isFormRequest(request) && isCrossSite(request, url)) return new Response(null, { status: 403 });
      return renderer.runEndpoint(request);
    }
    if (isActionRequest(request.method, url.search)) {
      if (isCrossSite(request, url)) return new Response(null, { status: 403 });
      const { headers, result } = await renderer.runAction(request);
      if (!result) return new Response(null, { status: 404, headers });
      // `submitAction` 提交时返回结果，原生表单提交时跳转到 `redirect` 的地址或者当前页面，出错时渲染错误页面
      if (request.headers.get('accept') === 'application/json') return Response.json(result, { headers });
      if (result.type === 'error') {
        const page = await renderHtml(request, result.error);
        for (const cookie of headers.getSetCookie()) page.headers.append('set-cookie', cookie);
        return page;
      }
      headers.set('location', result.type === 'redirect' ? result.location : pathname);
      return new Response(null, { status: 303, headers });
    }
    if (isDataRequest(pathname)) {
      const body = await readPrerendered(url);
      if (body) return new Response(body, { headers: { 'content-type': 'application/json' } });
      // 没有预渲染的页面客户端使用 `ELEMENT_PATH` 渲染，开启预渲染时导航总会请求，避免 404
      if (pathname.endsWith(ELEMENTS_FILE)) return Response.json({});
      const { status, headers, body: file } = await renderer.loadData(request);
      return Response.json(file, { status, headers });
    }
    const body = await readPrerendered(url);
    if (body) return new Response(body, { headers: { 'content-type': HTML_TYPE } });
    return renderHtml(request);
  };
  return Object.assign(handler, { isEndpoint: (pathname: string) => !!renderer.matchEndpoint(pathname) });
}

export async function createHandler(distDir: string, options?: Pick<HandlerOptions, 'origin'>) {
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
  const handler = await createHandler(distDir, { origin });
  const app = new Hono();
  const assets = serveStatic({ root: path.relative(process.cwd(), getDistPaths(distDir).webDir) });
  app.use('/*', (ctx, next) => (isQueryRequest(new URL(ctx.req.url)) ? next() : assets(ctx, next)));
  app.all('*', (ctx) => handler(ctx.req.raw));
  serve({ fetch: app.fetch, port }, ({ port }) => console.log(`gemkit: listening on http://localhost:${port}/`));
}
