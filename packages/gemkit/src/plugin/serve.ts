import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';

import { DATA_FILE, ELEMENT_PATH, ELEMENTS_FILE } from '../constants';
import type { Renderer } from '../server';

export const getDistPaths = (distDir: string) => ({
  webDir: path.join(distDir, 'web'),
  serverDir: path.join(distDir, 'server'),
  serverEntry: path.join(distDir, 'server', 'index.js'),
  template: path.join(distDir, 'server', 'template.html'),
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

export type Handler = (request: Request) => Promise<Response>;

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
 * 其他网站提交的表单（CSRF），优先使用浏览器的 `Sec-Fetch-Site`，
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

export interface HandlerOptions {
  /** 预渲染的文件目录，优先使用其中的文件 */
  webDir?: string;
  /**
   * 网站的 origin，例如 `https://example.com`，部署在反向代理后面时设置，
   * 否则使用 `Host` 请求头和连接的协议，`load` 中的 `url`、cookie 的 `Secure` 和同源检查都使用它
   */
  origin?: string;
}

/** 处理页面、页面数据和表单提交请求，提供 `webDir` 时优先使用预渲染的文件 */
export function createRequestHandler(
  renderer: Renderer,
  template: string,
  { webDir, origin }: HandlerOptions = {},
): Handler {
  const trustedOrigin = origin && new URL(origin).origin;
  const readStatic = async (url: URL, pathname = url.pathname) => {
    if (!webDir || isQueryRequest(url)) return;
    let file: string;
    try {
      file = path.join(webDir, decodeURIComponent(pathname));
    } catch {
      // 不合法的 URL 编码，由 SSR 渲染 404 页面
      return;
    }
    if (file.startsWith(webDir + path.sep) && existsSync(file)) return readFile(file, 'utf8');
  };
  return async (input) => {
    const request = trustedOrigin ? withOrigin(input, trustedOrigin) : input;
    const url = new URL(request.url);
    const { pathname } = url;
    if (pathname === ELEMENT_PATH) {
      const { url: pageUrl, elements } = await request.json();
      return Response.json(await renderer.renderElements(new URL(pageUrl, url).href, elements));
    }
    if (isActionRequest(request.method, url.search)) {
      if (isCrossSite(request, url)) return new Response(null, { status: 403 });
      const { headers, result } = await renderer.runAction(request);
      if (!result) return new Response(null, { status: 404, headers });
      // `submitAction` 提交时返回结果，原生表单提交时跳转到 `redirect` 的地址或者当前页面
      if (request.headers.get('accept') === 'application/json') return Response.json(result, { headers });
      headers.set('location', result.type === 'redirect' ? result.location : pathname);
      return new Response(null, { status: 303, headers });
    }
    if (isDataRequest(pathname)) {
      const body = await readStatic(url);
      if (body) return new Response(body, { headers: { 'content-type': 'application/json' } });
      // 没有预渲染时客户端使用 `ELEMENT_PATH` 渲染，导航时总会请求，避免 404
      if (pathname.endsWith(ELEMENTS_FILE)) return Response.json({});
      const { status, headers, data } = await renderer.loadData(request);
      return Response.json(data, { status, headers });
    }
    const body = await readStatic(url, path.posix.join(pathname, 'index.html'));
    if (body) return new Response(body, { headers: { 'content-type': HTML_TYPE } });
    const { status, headers, html } = await renderer.renderDocument(template, request);
    headers.set('content-type', HTML_TYPE);
    return new Response(toStream(html), { status, headers });
  };
}

export async function createHandler(distDir: string, options?: Omit<HandlerOptions, 'webDir'>) {
  const { renderer, template } = await loadRenderer(distDir);
  return createRequestHandler(renderer, template, { ...options, webDir: getDistPaths(distDir).webDir });
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
  app.on(['GET', 'POST'], '*', (ctx) => handler(ctx.req.raw));
  serve({ fetch: app.fetch, port }, ({ port }) => console.log(`gemkit: listening on http://localhost:${port}/`));
}
