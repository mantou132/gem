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

/** 表单提交到页面的 `actions`，地址是 `<page path>?/<name>` */
export const isActionRequest = (method: string, search: string) => method === 'POST' && search.startsWith('?/');

export type Handler = (request: Request) => Promise<Response>;

const HTML_TYPE = 'text/html; charset=utf-8';

/** 流式输出 HTML */
const toStream = (html: AsyncIterator<string>) =>
  new ReadableStream<string>({
    async pull(controller) {
      const { done, value } = await html.next();
      if (done) controller.close();
      else controller.enqueue(value);
    },
  }).pipeThrough(new TextEncoderStream());

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

/** 处理页面、页面数据和表单提交请求，提供 `webDir` 时优先使用预渲染的文件 */
export function createRequestHandler(renderer: Renderer, template: string, webDir?: string): Handler {
  const readStatic = async (pathname: string) => {
    if (!webDir) return;
    const file = path.join(webDir, decodeURIComponent(pathname));
    if (file.startsWith(webDir + path.sep) && existsSync(file)) return readFile(file, 'utf8');
  };
  return async (request) => {
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
      const body = await readStatic(pathname);
      if (body) return new Response(body, { headers: { 'content-type': 'application/json' } });
      // 没有预渲染时客户端使用 `ELEMENT_PATH` 渲染，导航时总会请求，避免 404
      if (pathname.endsWith(ELEMENTS_FILE)) return Response.json({});
      const { status, headers, data } = await renderer.loadData(request);
      return Response.json(data, { status, headers });
    }
    const body = await readStatic(path.posix.join(pathname, 'index.html'));
    if (body) return new Response(body, { headers: { 'content-type': HTML_TYPE } });
    const { status, headers, html } = await renderer.renderDocument(template, request);
    headers.set('content-type', HTML_TYPE);
    return new Response(toStream(html), { status, headers });
  };
}

export async function createHandler(distDir: string) {
  const { renderer, template } = await loadRenderer(distDir);
  return createRequestHandler(renderer, template, getDistPaths(distDir).webDir);
}

export async function start({ root = process.cwd(), port = Number(process.env.PORT) || 3000 } = {}) {
  const distDir = path.join(root, 'dist');
  const handler = await createHandler(distDir);
  const app = new Hono();
  app.use('/*', serveStatic({ root: path.relative(process.cwd(), getDistPaths(distDir).webDir) }));
  app.on(['GET', 'POST'], '*', (ctx) => handler(ctx.req.raw));
  serve({ fetch: app.fetch, port }, ({ port }) => console.log(`gemkit: listening on http://localhost:${port}/`));
}
