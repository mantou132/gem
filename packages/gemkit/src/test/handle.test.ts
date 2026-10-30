// 必须在 Gem 之前执行，用来模拟 DOM 环境
import '@mantou/gem-ssr';

import test from 'node:test';

import { GemElement, html, template } from '@mantou/gem';

import { type ErrorData, error, getRequestEvent, type Handle, type ServerModule } from '../data';
import { prerenderPage } from '../handler';
import { createRequestHandler } from '../node';
import { errorRoute, pageRoute, setOutlets } from '../outlet';
import { page } from '../page';
import { createRenderer } from '../server';

@page('Home')
class HomePage extends GemElement {
  @template()
  #content = () => html`home`;
}

@page<Record<string, string>, ErrorData>({ title: ({ data }) => `Error ${data.status}` })
class ErrorPage extends GemElement {
  data?: ErrorData;

  @template()
  #content = () => html`error ${this.data?.status}`;
}

const home = { tag: 'gemkit-page-index', load: async () => ({ default: HomePage }), server: true };

const serverModules: Record<string, () => Promise<ServerModule>> = {
  [home.tag]: async () => ({
    load: ({ setHeaders }) => {
      setHeaders({ 'cache-control': 'public, max-age=60' });
      return 'home';
    },
  }),
};

const errorPage = errorRoute(
  { tag: 'gemkit-page-error', load: async () => ({ default: ErrorPage }) },
  (params, err) => html`<gemkit-page-error .params=${params} .data=${err}></gemkit-page-error>`,
);
setOutlets({ '': [pageRoute('/', home, () => html`<gemkit-page-index></gemkit-page-index>`), errorPage] }, errorPage);

// 安全响应头、按路径直接响应、`resolve()` 之前出错、`resolve()` 之后修改响应
const handle: Handle = async (event, resolve) => {
  event.setHeaders({ 'x-frame-options': 'DENY' });
  if (event.path === '/health') return new Response('ok');
  if (event.url.searchParams.has('blocked')) error(403, 'Blocked');
  if (event.path === '/invalid') return undefined as unknown as Response;
  const response = await resolve();
  response.headers.set('x-status', String(response.status));
  return response;
};

const renderer = createRenderer({
  app: html`<gemkit-outlet></gemkit-outlet>`,
  serverModules,
  endpoints: [
    {
      pattern: '/api/ping',
      load: async () => ({
        GET: () => {
          getRequestEvent().setHeaders({ 'x-api': '1', 'x-override': 'event' });
          return new Response('pong', { headers: { 'x-override': 'response' } });
        },
        POST: ({ setHeaders }) => setHeaders({ 'Set-Cookie': 'a=1' }),
      }),
    },
  ],
  appServerModule: { handle },
});

const documentTemplate = '<!doctype html><html><head><title></title></head><body><!--gemkit-body--></body></html>';

const handler = createRequestHandler(renderer, documentTemplate);
const request = (path: string, init?: RequestInit) => handler(new Request(`http://localhost${path}`, init));

test('handle: `resolve()` 之后修改响应，`setHeaders` 设置的响应头', async ({ assert }) => {
  const page = await request('/');
  assert.equal(page.status, 200);
  assert.match(await page.text(), /home/);
  assert.equal(page.headers.get('x-frame-options'), 'DENY');
  assert.equal(page.headers.get('x-status'), '200');
  assert.equal(page.headers.get('cache-control'), 'public, max-age=60', '`load` 中设置');
  const data = await request('/__data.json');
  assert.deepEqual(await data.json(), { data: { [home.tag]: 'home' } });
  assert.equal(data.headers.get('x-frame-options'), 'DENY');
  assert.equal(data.headers.get('cache-control'), 'public, max-age=60');
  const missing = await request('/missing');
  assert.equal(missing.headers.get('x-status'), '404');
});

test('handle: 不调用 `resolve()` 直接响应', async ({ assert }) => {
  const res = await request('/health');
  assert.equal(await res.text(), 'ok');
});

test('handle: `resolve()` 之前出错时由请求的类型决定响应', async ({ assert }) => {
  const page = await request('/?blocked');
  assert.equal(page.status, 403);
  assert.match(await page.text(), /error .*403/s);
  assert.equal(page.headers.get('x-frame-options'), 'DENY', '出错之前设置的响应头');
  assert.equal(page.headers.get('x-status'), null);
});

test('handle: 必须返回 `Response`', async ({ assert }) => {
  await assert.rejects(request('/invalid'), /`handle` must return a `Response`/);
});

test('setHeaders: API 路由返回的 `Response` 的响应头优先，不能设置 cookie', async ({ assert }) => {
  const res = await request('/api/ping');
  assert.equal(await res.text(), 'pong');
  assert.equal(res.headers.get('x-api'), '1');
  assert.equal(res.headers.get('x-override'), 'response');
  assert.equal(res.headers.get('x-status'), '200');
  const cookie = await request('/api/ping', { method: 'POST' });
  assert.equal(cookie.status, 500);
});

test('prerenderPage: 预渲染时也执行 `handle`，文件没有响应头', async ({ assert }) => {
  const result = await prerenderPage(renderer, documentTemplate, '/');
  assert.match(result!.files.get('/index.html')!, /home/);
  assert.equal(await prerenderPage(renderer, documentTemplate, '/?blocked'), undefined, '`resolve()` 之前出错');
});
