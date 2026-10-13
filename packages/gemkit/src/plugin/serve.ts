import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { stream } from 'hono/streaming';

import { DATA_FILE } from '../constants';
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

export const isDataRequest = (pathname: string) => pathname.endsWith(`/${DATA_FILE}`);

export type Handler = (
  url: string,
) => Promise<{ status: number; type: 'html' | 'json'; body: string | AsyncIterable<string> }>;

/** 处理页面和页面数据请求，提供 `webDir` 时优先使用预渲染的文件 */
export function createRequestHandler(renderer: Renderer, template: string, webDir?: string): Handler {
  const readStatic = async (pathname: string) => {
    if (!webDir) return;
    const file = path.join(webDir, decodeURIComponent(pathname));
    if (file.startsWith(webDir + path.sep) && existsSync(file)) return readFile(file, 'utf8');
  };
  return async (url) => {
    const { pathname } = new URL(url, 'http://localhost');
    if (isDataRequest(pathname)) {
      const body = await readStatic(pathname);
      if (body) return { status: 200, type: 'json', body };
      const { status, data } = await renderer.loadData(url);
      return { status, type: 'json', body: JSON.stringify(data) };
    }
    const body = await readStatic(path.posix.join(pathname, 'index.html'));
    if (body) return { status: 200, type: 'html', body };
    const { status, html } = await renderer.renderDocument(template, url);
    return { status, type: 'html', body: html };
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
  app.get('*', async (ctx) => {
    const { status, type, body } = await handler(ctx.req.url);
    ctx.status(status as 200);
    ctx.header('Content-Type', type === 'json' ? 'application/json' : 'text/html; charset=UTF-8');
    if (typeof body === 'string') return ctx.body(body);
    return stream(ctx, async (s) => {
      for await (const chunk of body) await s.write(chunk);
    });
  });
  serve({ fetch: app.fetch, port }, ({ port }) => console.log(`gemkit: listening on http://localhost:${port}/`));
}
