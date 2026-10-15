// 必须在 Gem 之前执行，用来模拟 DOM 环境
import '@mantou/gem-ssr';

import test from 'node:test';

import {
  attribute,
  createState,
  customElement,
  GemElement,
  html,
  mounted,
  type TemplateResult,
  template,
} from '@mantou/gem';
import { I18n } from '@mantou/gem/helper/i18n';
import { getServerElementKey, server } from '@mantou/gem-ssr/decorators';

import { DATA_SCRIPT_ID, NOT_FOUND_HEADER, REDIRECT_HEADER } from '../constants';
import { notFound, redirect, type ServerModule } from '../data';
import { pageRoute, setOutlets } from '../outlet';
import { type Params, page } from '../page';
import { createRequestHandler } from '../plugin/serve';
import { createRenderer, type PageEntry } from '../server';

@customElement('app-server-note')
@server()
class ServerNoteElement extends GemElement {
  @attribute text: string;

  @template()
  #content = () => html`<p>note: ${this.text}</p>`;
}

@page('Home')
class HomePage extends GemElement {
  @template()
  #content = () => html`<h1>home</h1><app-server-note text="hi"></app-server-note>`;
}

@page({ title: (params) => `Post ${params.id}` })
class PostPage extends GemElement {
  data: { id: string; text: string; url: string };

  @template()
  #content = () => html`<p>${this.data.text}</p>`;
}

@page({ paths: () => [{ tag: 'a' }, { tag: 'b c' }] })
class TagPage extends GemElement {
  @template()
  #content = () => html`tag`;
}

@page('Slow')
class SlowPage extends GemElement {
  #state = createState({ text: 'loading' });

  @server()
  @mounted()
  #load = async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
    this.#state({ text: 'slow content' });
  };

  @template()
  #content = () => html`<p>${this.#state.text}</p>`;
}

@page('Me')
class MePage extends GemElement {
  data: { token?: string };

  @template()
  #content = () => html`<p>token: ${this.data.token}</p>`;
}

@page('Not Found')
class NotFoundPage extends GemElement {
  @template()
  #content = () => html`not found`;
}

const pages: PageEntry[] = [
  { pattern: '/slow', tag: 'gemkit-page-slow', load: async () => ({ default: SlowPage }) },
  { pattern: '/posts/:id', tag: 'gemkit-page-post', load: async () => ({ default: PostPage }) },
  { pattern: '/tags/:tag', tag: 'gemkit-page-tag', load: async () => ({ default: TagPage }) },
  { pattern: '/me', tag: 'gemkit-page-me', load: async () => ({ default: MePage }) },
  { pattern: '/', tag: 'gemkit-page-index', load: async () => ({ default: HomePage }) },
];

const serverModules: Record<string, () => Promise<ServerModule>> = {
  'gemkit-page-post': async () => ({
    load: ({ params, url }) => {
      if (params.id === 'missing') notFound();
      return { id: params.id, text: '</script><b>', url: url.pathname };
    },
    paths: () => [{ id: '1' }, { id: '2' }],
  }),
  'gemkit-page-me': async () => ({
    prerender: false,
    load: ({ cookies }) => {
      const token = cookies.get('token');
      if (!token) redirect(302, '/login');
      cookies.set('seen', '1');
      return { token };
    },
    actions: {
      login: async ({ request, cookies }) => {
        const form = await request.formData();
        const token = form.get('token');
        if (!token) return { error: 'required' };
        cookies.set('token', String(token));
        redirect(303, '/me');
      },
    },
  }),
};

// 和生成的 `routes.ts` 一样，模版中使用静态的标签名
const [slow, post, tag, me, index] = pages;
const notFoundPage: PageEntry = { pattern: '*', tag: 'gemkit-page-404', load: async () => ({ default: NotFoundPage }) };
const route = ({ pattern, tag, load }: PageEntry, render: (params: Params, data: any) => TemplateResult) =>
  pageRoute(pattern, { tag, load, server: tag in serverModules }, render);

const notFoundRoute = route(notFoundPage, () => html`<gemkit-page-404></gemkit-page-404>`);
setOutlets(
  {
    '': [
      route(slow, () => html`<gemkit-page-slow></gemkit-page-slow>`),
      route(post, (p, d) => html`<gemkit-page-post .params=${p} .data=${d}></gemkit-page-post>`),
      route(tag, (p) => html`<gemkit-page-tag .params=${p}></gemkit-page-tag>`),
      route(me, (_, d) => html`<gemkit-page-me .data=${d}></gemkit-page-me>`),
      route(index, () => html`<gemkit-page-index></gemkit-page-index>`),
      notFoundRoute,
    ],
  },
  notFoundRoute,
);

const renderer = createRenderer({
  app: html`<gemkit-outlet></gemkit-outlet>`,
  pages,
  serverModules,
  i18n: new I18n({ resources: { en: {}, zh: {} }, fallbackLanguage: 'en' }),
  languages: ['en', 'zh'],
  defaultLanguage: 'en',
  title: 'Site',
  titleTemplate: '%s | Site',
});

const documentTemplate =
  '<!doctype html><html lang="en"><head><title>Gemkit</title></head><body><!--gemkit-body--></body></html>';

async function renderPage(url: string) {
  const { status, html } = await renderer.renderDocument(documentTemplate, url);
  const chunks: string[] = [];
  for await (const chunk of html) chunks.push(chunk);
  return { status, chunks, html: chunks.join('') };
}

test('renderDocument: 渲染页面和标题', async ({ assert }) => {
  const { status, html } = await renderPage('/');
  assert.equal(status, 200);
  assert.match(html, /<title>Home \| Site<\/title>/);
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<h1>.*home<\/h1>/);
  // 没有 `load` 的页面不输出数据
  assert.doesNotMatch(html, new RegExp(`id="${DATA_SCRIPT_ID}"`));
});

test('renderDocument: 未匹配的页面返回 404', async ({ assert }) => {
  const { status, html } = await renderPage('/a/b');
  assert.equal(status, 404);
  assert.match(html, /<title>Not Found \| Site<\/title>/);
  assert.match(html, /not found/);
});

test('renderDocument: 非默认语言设置 `<html lang>`', async ({ assert }) => {
  const { status, html } = await renderPage('/zh/posts/1');
  assert.equal(status, 200);
  assert.match(html, /<html lang="zh">/);
  assert.match(html, /<title>Post 1 \| Site<\/title>/);
});

test('renderDocument: 输出页面数据并转义 `</script>`', async ({ assert }) => {
  const { html } = await renderPage('/posts/1?q=1');
  const [, json = ''] =
    html.match(new RegExp(`<script type="application/json" id="${DATA_SCRIPT_ID}">(.*?)</script>`)) || [];
  assert.doesNotMatch(json, /</);
  assert.deepEqual(JSON.parse(json), {
    path: '/posts/1',
    data: { 'gemkit-page-post': { id: '1', text: '</script><b>', url: '/posts/1' } },
  });
  // 页面内容中转义了 `<`
  assert.match(html, /<p>.*&lt;\/script&gt;&lt;b&gt;<\/p>/);
});

test('renderDocument: 先输出文档头部，再流式输出异步内容', async ({ assert }) => {
  const { status, chunks, html } = await renderPage('/slow');
  assert.equal(status, 200);
  assert.equal(chunks.length > 1, true);
  assert.match(chunks[0], /<title>Slow \| Site<\/title>/);
  assert.doesNotMatch(chunks[0], /slow content/);
  assert.match(html, /slow content/);
  assert.match(html, /<\/body><\/html>$/);
});

const loadData = async (input: Request | string) => {
  const { status, data } = await renderer.loadData(input);
  return { status, data };
};

test('loadData: 返回服务端数据', async ({ assert }) => {
  assert.deepEqual(await loadData('/posts/2/__data.json'), {
    status: 200,
    data: { 'gemkit-page-post': { id: '2', text: '</script><b>', url: '/posts/2' } },
  });
  // `url` 包含语言前缀
  assert.deepEqual(await loadData('/zh/posts/2/__data.json'), {
    status: 200,
    data: { 'gemkit-page-post': { id: '2', text: '</script><b>', url: '/zh/posts/2' } },
  });
});

test('loadData: 没有服务端 `load` 的页面返回 404', async ({ assert }) => {
  assert.deepEqual(await loadData('/__data.json'), { status: 404, data: null });
  assert.deepEqual(await loadData('/a/b/__data.json'), { status: 404, data: null });
});

const request = (url: string, init?: RequestInit) => new Request(new URL(url, 'http://localhost'), init);

test('renderDocument: `load` 读取和设置 cookie', async ({ assert }) => {
  const { status, headers, html } = await renderer.renderDocument(
    documentTemplate,
    request('/me', { headers: { cookie: 'token=a%3Bb' } }),
  );
  assert.equal(status, 200);
  assert.deepEqual(headers.getSetCookie(), ['seen=1; Path=/; HttpOnly; SameSite=Lax']);
  assert.match((await Array.fromAsync(html)).join(''), /token: .*a;b/);
});

test('renderDocument: `load` 中跳转', async ({ assert }) => {
  const { status, headers, html } = await renderer.renderDocument(documentTemplate, request('/me'));
  assert.equal(status, 302);
  assert.equal(headers.get('location'), '/login');
  assert.deepEqual(await Array.fromAsync(html), []);
});

test('loadData: `load` 中跳转时通过响应头告诉客户端', async ({ assert }) => {
  const { status, headers, data } = await renderer.loadData(request('/me/__data.json'));
  assert.equal(status, 200);
  assert.equal(headers.get(REDIRECT_HEADER), '/login');
  assert.equal(data, null);
});

test('runAction: 执行 action，返回结果或者跳转', async ({ assert }) => {
  const post = (url: string, token?: string) => {
    const body = new FormData();
    if (token) body.set('token', token);
    return renderer.runAction(request(url, { method: 'POST', body }));
  };
  const failed = await post('/me?/login');
  assert.deepEqual(failed.result, { type: 'success', data: { error: 'required' } });
  const success = await post('/me?/login', 'x');
  assert.deepEqual(success.result, { type: 'redirect', location: '/me' });
  assert.deepEqual(success.headers.getSetCookie(), ['token=x; Path=/; HttpOnly; SameSite=Lax']);
  // 不存在的 action
  assert.equal((await post('/me?/logout')).result, null);
  assert.equal((await post('/me?/constructor')).result, null);
  assert.equal((await post('/posts/1?/login')).result, null);
});

test('createRequestHandler: 表单提交', async ({ assert }) => {
  const handler = createRequestHandler(renderer, documentTemplate);
  const body = new URLSearchParams({ token: 'x' });
  // 原生表单提交跳转
  const res = await handler(request('/me?/login', { method: 'POST', body }));
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), '/me');
  // 没有跳转时回到当前页面
  const back = await handler(request('/me?/login', { method: 'POST', body: new URLSearchParams() }));
  assert.equal(back.headers.get('location'), '/me');
  // `submitAction` 提交
  const json = await handler(request('/me?/login', { method: 'POST', body, headers: { accept: 'application/json' } }));
  assert.deepEqual(await json.json(), { type: 'redirect', location: '/me' });
  assert.equal(json.headers.get('set-cookie'), 'token=x; Path=/; HttpOnly; SameSite=Lax');
});

test('createRequestHandler: 拒绝其他网站提交的表单', async ({ assert }) => {
  const handler = createRequestHandler(renderer, documentTemplate);
  const submit = (headers: Record<string, string>) =>
    handler(request('/me?/login', { method: 'POST', body: new URLSearchParams({ token: 'x' }), headers }));
  assert.equal((await submit({ 'sec-fetch-site': 'cross-site' })).status, 403);
  assert.equal((await submit({ 'sec-fetch-site': 'same-site' })).status, 403);
  assert.equal((await submit({ 'sec-fetch-site': 'same-origin' })).status, 303);
  // 不支持 `Sec-Fetch-Site` 的浏览器，反向代理后协议不同时也允许
  assert.equal((await submit({ origin: 'https://evil.com' })).status, 403);
  assert.equal((await submit({ origin: 'https://localhost' })).status, 303);
});

test('createRequestHandler: 流式输出页面', async ({ assert }) => {
  const handler = createRequestHandler(renderer, documentTemplate);
  const res = await handler(request('/me', { headers: { cookie: 'token=t' } }));
  assert.equal(res.headers.get('content-type'), 'text/html; charset=utf-8');
  assert.equal(res.headers.get('set-cookie'), 'seen=1; Path=/; HttpOnly; SameSite=Lax');
  assert.match(await res.text(), /token: .*t<\/p>.*<\/html>$/);
});

test('canPrerender: 读取请求的页面不预渲染', async ({ assert }) => {
  assert.equal(await renderer.canPrerender('/me'), false);
  assert.equal(await renderer.canPrerender('/zh/me'), false);
  assert.equal(await renderer.canPrerender('/posts/1'), true);
});

test('getPaths: 展开动态路由和语言', async ({ assert }) => {
  const paths = ['/slow', '/posts/1', '/posts/2', '/tags/a', '/tags/b%20c'];
  assert.deepEqual(await renderer.getPaths(), [...paths, '/', ...paths.map((path) => `/zh${path}`), '/zh']);
});

test('hasServerData: 页面是否有服务端模块', ({ assert }) => {
  assert.equal(renderer.hasServerData('/posts/1'), true);
  assert.equal(renderer.hasServerData('/zh/posts/1'), true);
  assert.equal(renderer.hasServerData('/'), false);
});

const noteKey = getServerElementKey('app-server-note', { text: 'hi' }, {});

test('renderDocument: 预渲染时收集纯服务端元素', async ({ assert }) => {
  const serverElements = new Map<string, string>();
  const { html } = await renderer.renderDocument(documentTemplate, '/', { serverElements });
  await Array.fromAsync(html);
  assert.deepEqual([...serverElements.keys()], [noteKey]);
});

test('renderElements: 渲染页面中的纯服务端元素', async ({ assert }) => {
  const [note] = await renderer.renderElements('/zh', [{ tag: 'app-server-note', attrs: { text: 'x' }, props: {} }]);
  assert.match(note, /note: .*x/);
});

test('renderDocument: 预渲染时不能读取请求', async ({ assert }) => {
  await assert.rejects(
    renderer.renderDocument(documentTemplate, '/me'),
    /`cookies` is not available when prerendering/,
  );
});

test('renderDocument: `load` 中调用 `notFound()` 时渲染 404 页面，状态码为 404', async ({ assert }) => {
  const { status, html } = await renderer.renderDocument(documentTemplate, '/posts/missing');
  const result = (await Array.fromAsync(html)).join('');
  assert.equal(status, 404);
  assert.match(result, /<title>Not Found \| Site<\/title>/);
  assert.match(result, /<gemkit-page-404>.*not found.*<\/gemkit-page-404>/s);
  // 水合时直接渲染 404 页面
  assert.match(result, /"notFound":"gemkit-page-post"/);
});

test('loadData: `load` 中调用 `notFound()` 时通过响应头告诉客户端', async ({ assert }) => {
  const { status, headers, data } = await renderer.loadData('/posts/missing/__data.json');
  assert.equal(status, 200);
  assert.equal(headers.get(NOT_FOUND_HEADER), 'gemkit-page-post');
  assert.deepEqual(data, {});
});
