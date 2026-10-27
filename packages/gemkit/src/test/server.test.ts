// 必须在 Gem 之前执行，用来模拟 DOM 环境
import '@mantou/gem-ssr';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
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

import { createHandler as createCloudflareHandler } from '../adapters/cloudflare/runtime';
import { CLIENT_HEADER, DATA_SCRIPT_ID, REDIRECT_HEADER } from '../constants';
import {
  type EndpointModule,
  type ErrorData,
  endpoint,
  error,
  getRequestEvent,
  notFound,
  redirect,
  revalidatePath,
  type ServerModule,
  type StandardSchemaV1,
} from '../data';
import { createFetchHandler } from '../handler';
import { errorRoute, pageRoute, setOutlets } from '../outlet';
import { type Params, page } from '../page';
import { createRequestHandler } from '../plugin/serve';
import { createRenderer } from '../server';

declare module '../data' {
  interface Locals {
    user?: string;
  }
}

@customElement('app-server-note')
@server()
class ServerNoteElement extends GemElement {
  @attribute text: string;

  @template()
  #content = () => html`<p>note: ${this.text}</p>`;
}

@customElement('app-server-user')
@server()
class ServerUserElement extends GemElement {
  @template()
  #content = () => html`<p>user: ${getRequestEvent().locals.user}</p>`;
}

@page('Home')
class HomePage extends GemElement {
  @template()
  #content = () => html`<h1>home</h1><app-server-note text="hi"></app-server-note>`;
}

@page({ title: ({ params }) => `Post ${params.id}` })
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

@page('Sign in')
class LoginPage extends GemElement {
  @template()
  #content = () => html`<form method="post" action="?/login"></form>`;
}

@page<Params, ErrorData>({ title: ({ data }) => data.message })
class ErrorPage extends GemElement {
  data: ErrorData;

  @template()
  #content = () => html`${this.data.status}: ${this.data.message}`;
}

// 页面的标签名和模块，和生成的 `routes.ts` 一样
type PageEntry = { pattern: string; tag: string; load: () => Promise<{ default: CustomElementConstructor }> };

const pages: PageEntry[] = [
  { pattern: '/slow', tag: 'gemkit-page-slow', load: async () => ({ default: SlowPage }) },
  { pattern: '/posts/:id', tag: 'gemkit-page-post', load: async () => ({ default: PostPage }) },
  { pattern: '/tags/:tag', tag: 'gemkit-page-tag', load: async () => ({ default: TagPage }) },
  { pattern: '/me', tag: 'gemkit-page-me', load: async () => ({ default: MePage }) },
  { pattern: '/login', tag: 'gemkit-page-login', load: async () => ({ default: LoginPage }) },
  { pattern: '/', tag: 'gemkit-page-index', load: async () => ({ default: HomePage }) },
];

// 每次渲染都不同，用来判断是否使用了缓存
let tagVersion = 0;

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
  // 只有 `actions`，没有 `load`
  'gemkit-page-login': async () => ({ actions: { login: () => null } }),
  'gemkit-page-tag': async () => ({
    revalidate: 60,
    load: ({ params }) => {
      if (params.tag === 'missing') notFound();
      return { tag: params.tag, version: ++tagVersion };
    },
  }),
};

// 和生成的 `routes.ts` 一样，模版中使用静态的标签名
const [slow, post, tag, me, login, index] = pages;
const route = ({ pattern, tag, load }: PageEntry, render: (params: Params, data: any) => TemplateResult) =>
  pageRoute(pattern, { tag, load, server: tag in serverModules }, render);

const errorPage = errorRoute(
  { tag: 'gemkit-page-error', load: async () => ({ default: ErrorPage }) },
  (_, error) => html`<gemkit-page-error .data=${error}></gemkit-page-error>`,
);
setOutlets(
  {
    '': [
      route(slow, () => html`<gemkit-page-slow></gemkit-page-slow>`),
      route(post, (p, d) => html`<gemkit-page-post .params=${p} .data=${d}></gemkit-page-post>`),
      route(tag, (p) => html`<gemkit-page-tag .params=${p}></gemkit-page-tag>`),
      route(me, (_, d) => html`<gemkit-page-me .data=${d}></gemkit-page-me>`),
      route(login, () => html`<gemkit-page-login></gemkit-page-login>`),
      route(index, () => html`<gemkit-page-index></gemkit-page-index>`),
      errorPage,
    ],
  },
  errorPage,
);

const likes: Record<string, number> = {};

const likesEndpoint: EndpointModule = {
  GET: ({ params }) => ({ likes: likes[params.slug] || 0 }),
  POST: async ({ params, request, cookies }) => {
    const { count = 1 }: { count?: number } = await request.json();
    if (params.slug === 'locked') error(403, 'Locked');
    cookies.set('liked', params.slug);
    likes[params.slug] = (likes[params.slug] || 0) + count;
    return Response.json({ likes: likes[params.slug] }, { status: 201 });
  },
};

const loginEndpoint: EndpointModule = {
  POST: ({ cookies }, { token }: { token: string }) => {
    cookies.set('token', token);
    redirect(303, '/me');
  },
};

// 最小的 Standard Schema 实现：`count` 转换成数字
const countSchema: StandardSchemaV1<{ count: string | number }, { count: number }> = {
  '~standard': {
    version: 1,
    vendor: 'test',
    validate: (value) => {
      const count = Number((value as { count?: unknown })?.count);
      return Number.isInteger(count) ? { value: { count } } : { issues: [{ message: 'Invalid', path: ['count'] }] };
    },
  },
};

const renderer = createRenderer({
  app: html`<gemkit-outlet></gemkit-outlet>`,
  serverModules,
  endpoints: [
    { pattern: '/api/likes/:slug', load: async () => likesEndpoint },
    { pattern: '/admin/api', load: async () => ({ GET: () => getRequestEvent().locals.user }) },
    { pattern: '/old', load: async () => ({ GET: () => redirect(301, '/new') }) },
    { pattern: '/echo', load: async () => ({ GET: (_, input) => input, PUT: (_, input) => ({ input }) }) },
    { pattern: '/api/login', load: async () => loginEndpoint },
    {
      pattern: '/count',
      load: async () => ({ GET: endpoint(countSchema, (_, { count }) => ({ double: count * 2 })) }),
    },
  ],
  appServerModule: {
    // 只在需要时读取 `cookies`，读取后响应不能被共享缓存，也不预渲染
    handle: (event) => {
      if (!event.path.startsWith('/admin')) return;
      event.locals.user = event.cookies.get('user');
      if (!event.locals.user) redirect(302, '/login');
    },
  },
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
  assert.match(html, />404<.*Not Found/);
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

// 和客户端收到的一样，经过 JSON 序列化
const loadData = async (input: Request | string) => {
  const { status, body } = await renderer.loadData(input);
  return { status, body: JSON.parse(JSON.stringify(body)) };
};

test('loadData: 返回服务端数据', async ({ assert }) => {
  assert.deepEqual(await loadData('/posts/2/__data.json'), {
    status: 200,
    body: { data: { 'gemkit-page-post': { id: '2', text: '</script><b>', url: '/posts/2' } } },
  });
  // `url` 包含语言前缀
  assert.deepEqual(await loadData('/zh/posts/2/__data.json'), {
    status: 200,
    body: { data: { 'gemkit-page-post': { id: '2', text: '</script><b>', url: '/zh/posts/2' } } },
  });
});

test('loadData: 没有服务端 `load` 的页面返回空数据', async ({ assert }) => {
  assert.deepEqual(await loadData('/login/__data.json'), { status: 200, body: { data: {} } });
});

test('loadData: 没有服务端模块的页面返回 404', async ({ assert }) => {
  assert.deepEqual(await loadData('/__data.json'), { status: 404, body: null });
  assert.deepEqual(await loadData('/a/b/__data.json'), { status: 404, body: null });
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

test('loadData: `load` 中跳转时数据文件中只有跳转地址', async ({ assert }) => {
  assert.deepEqual(await loadData(request('/me/__data.json')), { status: 200, body: { redirect: '/login' } });
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
  // 平台把 `?/login` 编码成 `?%2Flogin`
  assert.equal((await handler(request('/me?%2Flogin', { method: 'POST', body }))).status, 303);
  // `submitAction` 提交
  const json = await handler(request('/me?/login', { method: 'POST', body, headers: { accept: 'application/json' } }));
  assert.deepEqual(await json.json(), { type: 'redirect', location: '/me' });
  assert.equal(json.headers.get('set-cookie'), 'token=x; Path=/; HttpOnly; SameSite=Lax');
});

test('endpoint: `$gemkit/api` 的请求跳转时响应跳转地址', async ({ assert }) => {
  const login = (headers: Record<string, string>) =>
    renderer.runEndpoint(
      request('/api/login', {
        method: 'POST',
        body: JSON.stringify({ token: 'x' }),
        headers: { 'content-type': 'application/json', ...headers },
      }),
    );
  const res = await login({ [CLIENT_HEADER]: '1' });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get(REDIRECT_HEADER), '/me');
  assert.equal(res.headers.get('location'), null);
  assert.deepEqual(res.headers.getSetCookie(), ['token=x; Path=/; HttpOnly; SameSite=Lax']);
  // 其他请求正常响应跳转
  const other = await login({});
  assert.equal(other.status, 303);
  assert.equal(other.headers.get('location'), '/me');
  // `handle` 中的跳转
  const denied = await renderer.runEndpoint(request('/admin/api', { headers: { [CLIENT_HEADER]: '1' } }));
  assert.equal(denied.headers.get(REDIRECT_HEADER), '/login');
});

test('endpoint: 使用 schema 校验和转换输入', async ({ assert }) => {
  const handler = createRequestHandler(renderer, documentTemplate);
  assert.deepEqual(await (await handler(request('/count?count=2'))).json(), { double: 4 });
  const invalid = await handler(request('/count?count=a'));
  assert.equal(invalid.status, 400);
  assert.deepEqual(await invalid.json(), {
    status: 400,
    message: 'Invalid input',
    issues: [{ message: 'Invalid', path: ['count'] }],
  });
});

test('createRequestHandler: 拒绝其他网站提交的表单和纯服务端元素请求', async ({ assert }) => {
  const handler = createRequestHandler(renderer, documentTemplate);
  const submit = (headers: Record<string, string>) =>
    handler(request('/me?/login', { method: 'POST', body: new URLSearchParams({ token: 'x' }), headers }));
  assert.equal((await submit({ 'sec-fetch-site': 'cross-site' })).status, 403);
  assert.equal((await submit({ 'sec-fetch-site': 'same-site' })).status, 403);
  assert.equal((await submit({ 'sec-fetch-site': 'same-origin' })).status, 303);
  // 不支持 `Sec-Fetch-Site` 的浏览器，反向代理后协议不同时也允许
  assert.equal((await submit({ origin: 'https://evil.com' })).status, 403);
  assert.equal((await submit({ origin: 'https://localhost' })).status, 303);
  const body = JSON.stringify({ url: '/', elements: [] });
  const res = await handler(
    request('/__gemkit_element', { method: 'POST', body, headers: { 'sec-fetch-site': 'cross-site' } }),
  );
  assert.equal(res.status, 403);
});

test('createRequestHandler: 流式输出页面', async ({ assert }) => {
  const handler = createRequestHandler(renderer, documentTemplate);
  const res = await handler(request('/me', { headers: { cookie: 'token=t' } }));
  assert.equal(res.headers.get('content-type'), 'text/html; charset=utf-8');
  assert.equal(res.headers.get('set-cookie'), 'seen=1; Path=/; HttpOnly; SameSite=Lax');
  assert.match(await res.text(), /token: .*t<\/p>.*<\/html>$/);
});

test('createRequestHandler: 带查询参数的页面和数据请求不使用预渲染的文件', async ({ assert }) => {
  const webDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gemkit-'));
  fs.mkdirSync(path.join(webDir, 'posts/1'), { recursive: true });
  fs.writeFileSync(path.join(webDir, 'posts/1/index.html'), 'prerendered');
  fs.writeFileSync(path.join(webDir, 'posts/1/__data.json'), '"prerendered"');
  const handler = createRequestHandler(renderer, documentTemplate, { webDir });
  assert.equal(await (await handler(request('/posts/1'))).text(), 'prerendered');
  assert.match(await (await handler(request('/posts/1?a=1'))).text(), /<title>Post 1 \| Site<\/title>/);
  assert.equal(await (await handler(request('/posts/1/__data.json'))).json(), 'prerendered');
  const { data } = await (await handler(request('/posts/1/__data.json?a=1'))).json();
  assert.equal(data['gemkit-page-post'].id, '1');
  // 不合法的 URL 编码
  assert.equal((await handler(request('/%E0%A4%A'))).status, 404);
  fs.rmSync(webDir, { recursive: true });
});

test('createRequestHandler: 读取了请求的响应不能被共享缓存', async ({ assert }) => {
  const handler = createRequestHandler(renderer, documentTemplate);
  const me = await handler(request('/me', { headers: { cookie: 'token=t' } }));
  assert.equal(me.headers.get('cache-control'), 'private, no-store');
  const data = await handler(request('/me/__data.json', { headers: { cookie: 'token=t' } }));
  assert.equal(data.headers.get('cache-control'), 'private, no-store');
  assert.equal((await handler(request('/posts/1'))).headers.get('cache-control'), null, '没有读取请求');
});

test('createRequestHandler: 使用配置的 origin', async ({ assert }) => {
  const handler = createRequestHandler(renderer, documentTemplate, { origin: 'https://example.com' });
  const submit = (headers: Record<string, string>) =>
    handler(request('/me?/login', { method: 'POST', body: new URLSearchParams({ token: 'x' }), headers }));
  // 反向代理后面请求的协议是 `http:`，cookie 仍然有 `Secure`
  const res = await submit({ origin: 'https://example.com' });
  assert.equal(res.status, 303);
  assert.match(res.headers.get('set-cookie')!, /; Secure/);
  assert.equal((await submit({ origin: 'http://localhost' })).status, 403, '和配置的 origin 比较');
});

test('canPrerender: 读取请求的页面不预渲染', async ({ assert }) => {
  assert.equal(await renderer.canPrerender('/me'), false);
  assert.equal(await renderer.canPrerender('/zh/me'), false);
  assert.equal(await renderer.canPrerender('/posts/1'), true);
  // `handle` 读取了 cookie
  assert.equal(await renderer.canPrerender('/admin'), false);
  assert.equal(await renderer.canPrerender('/zh/admin'), false);
});

test('getPaths: 展开动态路由和语言', async ({ assert }) => {
  const paths = ['/slow', '/posts/1', '/posts/2', '/tags/a', '/tags/b%20c', '/login'];
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
  const elements = [{ tag: 'app-server-note', attrs: { text: 'x' }, props: {} }];
  const { html } = await renderer.renderElements(
    request('/__gemkit_element', { method: 'POST', body: JSON.stringify({ url: '/zh', elements }) }),
  );
  assert.match(html![0], /note: .*x/);
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
  assert.match(result, /<gemkit-page-error ssr-props=""[^>]*>.*>404<.*Not Found.*<\/gemkit-page-error>/s);
  // 水合时直接渲染错误页面
  assert.match(result, /"error":\{"tag":"gemkit-page-post","status":404,"message":"Not Found"\}/);
});

test('loadData: `load` 中调用 `notFound()` 时数据文件中有出错的路由', async ({ assert }) => {
  assert.deepEqual(await loadData('/posts/missing/__data.json'), {
    status: 200,
    body: { data: {}, error: { tag: 'gemkit-page-post', status: 404, message: 'Not Found' } },
  });
});

test('handle: 每个请求先执行，可以跳转', async ({ assert }) => {
  const { status, headers } = await renderer.renderDocument(documentTemplate, request('/admin'));
  assert.equal(status, 302);
  assert.equal(headers.get('location'), '/login');
  assert.deepEqual((await renderer.loadData(request('/admin/__data.json'))).body, { redirect: '/login' });
  const page = await renderer.renderDocument(documentTemplate, request('/admin', { headers: { cookie: 'user=a' } }));
  assert.equal(page.status, 404);
  // 读取了 cookie
  assert.equal(page.headers.get('cache-control'), 'private, no-store');
  // `path` 不包含语言前缀
  const zh = await renderer.renderDocument(documentTemplate, request('/zh/admin'));
  assert.equal(zh.headers.get('location'), '/login');
});

test('handle: 纯服务端元素的请求也先执行，元素中读取 `locals`', async ({ assert }) => {
  const body = JSON.stringify({ url: '/admin', elements: [{ tag: 'app-server-user', attrs: {}, props: {} }] });
  const denied = await renderer.renderElements(request('/__gemkit_element', { method: 'POST', body }));
  assert.equal(denied.html, null);
  assert.equal(denied.headers.get(REDIRECT_HEADER), '/login');
  const { html, headers } = await renderer.renderElements(
    request('/__gemkit_element', { method: 'POST', body, headers: { cookie: 'user=a' } }),
  );
  assert.match(html![0], /user: .*a/);
  assert.equal(headers.get('cache-control'), 'private, no-store');
});

test('getRequestEvent: 只能在服务端的请求中调用', ({ assert }) => {
  assert.throws(() => getRequestEvent(), /`getRequestEvent` can only be called in a server request/);
});

test('endpoint: 按请求方法处理，其他值作为 JSON 响应', async ({ assert }) => {
  const handler = createRequestHandler(renderer, documentTemplate);
  assert.deepEqual(await (await handler(request('/api/likes/a'))).json(), { likes: 0 });
  const post = (slug: string, init: RequestInit = {}) =>
    handler(request(`/api/likes/${slug}`, { method: 'POST', body: JSON.stringify({ count: 2 }), ...init }));
  const res = await post('a');
  assert.equal(res.status, 201);
  assert.deepEqual(await res.json(), { likes: 2 });
  assert.equal(res.headers.get('set-cookie'), 'liked=a; Path=/; HttpOnly; SameSite=Lax');
  assert.equal(res.headers.get('cache-control'), 'private, no-store');
  // 末尾的 `/`、`HEAD` 使用 `GET`
  assert.deepEqual(await (await handler(request('/api/likes/a/'))).json(), { likes: 2 });
  const head = await handler(request('/api/likes/a', { method: 'HEAD' }));
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  // 没有对应的请求方法
  const del = await handler(request('/api/likes/a', { method: 'DELETE' }));
  assert.equal(del.status, 405);
  assert.equal(del.headers.get('allow'), 'GET, POST');
  // `error` 响应 JSON 格式的错误
  const locked = await post('locked');
  assert.equal(locked.status, 403);
  assert.deepEqual(await locked.json(), { status: 403, message: 'Locked' });
  // 跨站的表单类型请求被拒绝，JSON 请求需要预检，由 CORS 限制
  assert.equal(
    (await post('b', { headers: { 'sec-fetch-site': 'cross-site', 'content-type': 'text/plain' } })).status,
    403,
  );
  assert.equal(
    (await post('b', { headers: { 'sec-fetch-site': 'cross-site', 'content-type': 'application/json' } })).status,
    201,
  );
});

test('endpoint: `GET` 的输入是查询参数，其他方法是 JSON 请求体', async ({ assert }) => {
  const handler = createRequestHandler(renderer, documentTemplate);
  assert.deepEqual(await (await handler(request('/echo?a=1&b=2'))).json(), { a: '1', b: '2' });
  const put = (body: string, type: string) =>
    handler(request('/echo', { method: 'PUT', body, headers: { 'content-type': type } }));
  assert.deepEqual(await (await put('{"a":[1]}', 'application/json')).json(), { input: { a: [1] } });
  // 不是 JSON 时没有输入，处理函数自己读取 `request`
  assert.deepEqual(await (await put('a=1', 'application/x-www-form-urlencoded')).json(), {});
  const invalid = await put('{', 'application/json');
  assert.equal(invalid.status, 400);
  assert.deepEqual(await invalid.json(), { status: 400, message: 'Invalid JSON' });
});

test('endpoint: 先执行 `handle`，可以跳转', async ({ assert }) => {
  const denied = await renderer.runEndpoint(request('/admin/api'));
  assert.equal(denied.status, 302);
  assert.equal(denied.headers.get('location'), '/login');
  const res = await renderer.runEndpoint(request('/admin/api', { headers: { cookie: 'user=a' } }));
  assert.equal(await res.json(), 'a');
  const old = await renderer.runEndpoint(request('/old'));
  assert.equal(old.status, 301);
  assert.equal(old.headers.get('location'), '/new');
  // 不匹配的路径不是 API 路由
  assert.equal(renderer.matchEndpoint('/api/likes'), undefined);
  assert.equal(createRequestHandler(renderer, documentTemplate).isEndpoint('/api/likes/a'), true);
});

test('getRevalidate: 页面和 layout 中最小的 `revalidate`', async ({ assert }) => {
  assert.equal(await renderer.getRevalidate('/tags/a'), 60);
  assert.equal(await renderer.getRevalidate('/zh/tags/a'), 60);
  assert.equal(await renderer.getRevalidate('/posts/1'), undefined);
});

test('createRequestHandler: ISR 缓存页面，过期后在后台重新渲染', async ({ assert }) => {
  const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gemkit-'));
  const handler = createRequestHandler(renderer, documentTemplate, { cacheDir });
  const getVersion = async (url: string) =>
    (await (await handler(request(url))).json()).data['gemkit-page-tag'].version;
  const html = await (await handler(request('/tags/a'))).text();
  assert.match(html, /<gemkit-page-tag/);
  // 和预渲染一样输出页面、数据和元素文件
  assert.deepEqual(fs.readdirSync(path.join(cacheDir, 'tags/a')).sort(), [
    '__data.json',
    '__elements.json',
    'index.html',
  ]);
  const version = await getVersion('/tags/a/__data.json');
  assert.equal(await (await handler(request('/tags/a'))).text(), html);
  // 带查询参数的请求不使用缓存
  assert.notEqual(await getVersion('/tags/a/__data.json?x=1'), version);
  // 过期后先返回旧内容
  const old = new Date(Date.now() - 61_000);
  fs.utimesSync(path.join(cacheDir, 'tags/a/__data.json'), old, old);
  assert.equal(await getVersion('/tags/a/__data.json'), version);
  for (let i = 0; i < 500 && (await getVersion('/tags/a/__data.json')) === version; i++) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  const regenerated = await getVersion('/tags/a/__data.json');
  assert.notEqual(regenerated, version);
  // 清除缓存后重新渲染
  await revalidatePath('/tags/a');
  assert.equal(fs.existsSync(path.join(cacheDir, 'tags/a/index.html')), false);
  assert.notEqual(await getVersion('/tags/a/__data.json'), regenerated);
  // 没有 `revalidate` 的页面和不能预渲染的页面不缓存
  await handler(request('/posts/1'));
  await handler(request('/me', { headers: { cookie: 'token=t' } }));
  assert.deepEqual(fs.readdirSync(cacheDir), ['tags']);
  fs.rmSync(cacheDir, { recursive: true });
});

test('createRequestHandler: ISR 不缓存跳转和出错的页面', async ({ assert }) => {
  const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gemkit-'));
  const handler = createRequestHandler(renderer, documentTemplate, { cacheDir });
  // 末尾的 `/` 和没有 `/` 的是同一个页面
  assert.equal((await handler(request('/tags/a/'))).status, 200);
  assert.equal(fs.existsSync(path.join(cacheDir, 'tags/a/index.html')), true);
  assert.equal((await handler(request('/tags/missing'))).status, 404);
  assert.equal(fs.existsSync(path.join(cacheDir, 'tags/missing')), false);
  fs.rmSync(cacheDir, { recursive: true });
});

test('createFetchHandler: ISR 页面使用 CDN 缓存，因人而异的页面不缓存', async ({ assert }) => {
  const handler = createFetchHandler(renderer, documentTemplate, {
    cdnCache: (revalidate) => ['cdn-cache-control', `s-maxage=${revalidate}`],
  });
  const getHeader = async (url: string, init?: RequestInit) =>
    (await handler(request(url, init))).headers.get('cdn-cache-control');
  assert.equal(await getHeader('/tags/a'), 's-maxage=60');
  assert.equal(await getHeader('/tags/a/__data.json'), 's-maxage=60');
  assert.equal(await getHeader('/posts/1'), null);
  assert.equal(await getHeader('/tags/missing'), null);
  assert.equal(await getHeader('/me', { headers: { cookie: 'token=t' } }), null);
});

test('createCloudflareHandler: ISR 使用 KV，过期后在 `waitUntil` 中重新渲染', async ({ assert }) => {
  const kv = new Map<string, { value: string; metadata: any }>();
  const env = {
    GEMKIT_CACHE: {
      getWithMetadata: async (key: string) => kv.get(key) || { value: null, metadata: null },
      put: async (key: string, value: string, { metadata }: { metadata?: unknown } = {}) => {
        kv.set(key, { value, metadata });
      },
      delete: async (key: string) => {
        kv.delete(key);
      },
    },
  };
  const tasks: Promise<unknown>[] = [];
  const ctx = { waitUntil: (promise: Promise<unknown>) => tasks.push(promise) };
  const { fetch } = createCloudflareHandler(renderer, documentTemplate);
  const getVersion = async (url: string) =>
    (await (await fetch(request(url), env, ctx)).json()).data['gemkit-page-tag'].version;
  const version = await getVersion('/tags/a/__data.json');
  assert.deepEqual([...kv.keys()].sort(), ['/tags/a/__data.json', '/tags/a/__elements.json', '/tags/a/index.html']);
  assert.equal(await getVersion('/tags/a/__data.json'), version);
  assert.equal(tasks.length, 0);
  kv.get('/tags/a/__data.json')!.metadata = { time: Date.now() - 61_000 };
  assert.equal(await getVersion('/tags/a/__data.json'), version, '先返回旧内容');
  assert.equal(tasks.length, 1);
  await Promise.all(tasks);
  assert.notEqual(await getVersion('/tags/a/__data.json'), version);
});
