// 必须在 Gem 之前执行，用来模拟 DOM 环境
import '@mantou/gem-ssr';

import test from 'node:test';

import { GemElement, html, template } from '@mantou/gem';

import { type ErrorData, error, fetchData, HttpError, type ServerModule } from '../data';
import { errorRoute, layoutRoute, pageRoute, setOutlets } from '../outlet';
import { layout, page } from '../page';
import { createRequestHandler } from '../plugin/serve';
import { createRenderer } from '../server';

@layout({ meta: { description: 'Site description', 'og:site_name': 'Site' } })
class RootLayout extends GemElement {
  @template()
  #content = () => html`<nav>nav</nav><gemkit-outlet></gemkit-outlet>`;
}

@page<Record<string, string>, { summary: string }>({
  title: 'Home',
  meta: (_, data) => ({ description: data.summary, 'og:image': undefined }),
})
class HomePage extends GemElement {
  @template()
  #content = () => html`home`;
}

@page({ title: 'Crash', meta: { description: 'Crash description' } })
class CrashPage extends GemElement {
  @template()
  #content = () => html`crash`;
}

@page('Form')
class FormPage extends GemElement {
  @template()
  #content = () => html`<form method="post" action="?/save"></form>`;
}

@page('Guarded')
class GuardedPage extends GemElement {
  @template()
  #content = () => html`guarded`;
}

@layout()
class PrivateLayout extends GemElement {
  @template()
  #content = () => html`<gemkit-outlet></gemkit-outlet>`;
}

@page('Doc')
class DocPage extends GemElement {
  @template()
  #content = () => html`doc`;
}

@page<Record<string, string>, ErrorData>({
  title: (_, { status }) => `Error ${status}`,
  meta: (_, { message }) => ({ 'og:title': message }),
})
class ErrorPage extends GemElement {
  data: ErrorData;

  @template()
  #content = () => html`<p>error ${this.data.status} ${this.data.message}</p>`;
}

const root = { tag: 'gemkit-layout-root', load: async () => ({ default: RootLayout }) };
const home = { tag: 'gemkit-page-index', load: async () => ({ default: HomePage }), server: true };
const crash = { tag: 'gemkit-page-crash', load: async () => ({ default: CrashPage }), server: true };
const form = { tag: 'gemkit-page-form', load: async () => ({ default: FormPage }), server: true };
const guarded = { tag: 'gemkit-page-guarded', load: async () => ({ default: GuardedPage }), server: true };
const privateLayout = { tag: 'gemkit-layout-private', load: async () => ({ default: PrivateLayout }), server: true };
const doc = { tag: 'gemkit-page-private-doc', load: async () => ({ default: DocPage }), server: true };

const serverModules: Record<string, () => Promise<ServerModule>> = {
  [home.tag]: async () => ({ load: () => ({ summary: 'Home "summary" <b>' }) }),
  [crash.tag]: async () => ({
    load: () => {
      throw new Error('db down');
    },
  }),
  [form.tag]: async () => ({
    actions: {
      save: ({ cookies }) => {
        cookies.set('draft', '1');
        error(422, 'Invalid');
      },
    },
  }),
  [guarded.tag]: async () => ({ load: () => 'guarded data' }),
  [privateLayout.tag]: async () => ({ load: () => error(403, 'Forbidden') }),
  [doc.tag]: async () => ({ load: () => 'doc data' }),
};

// 和生成的 `routes.ts` 一样
const errorPage = errorRoute(
  { tag: 'gemkit-page-error', load: async () => ({ default: ErrorPage }) },
  (params, err) => html`<gemkit-page-error .params=${params} .data=${err}></gemkit-page-error>`,
);
setOutlets(
  {
    '': [layoutRoute('*', root, () => html`<gemkit-layout-root></gemkit-layout-root>`)],
    [root.tag]: [
      pageRoute('/crash', crash, () => html`<gemkit-page-crash></gemkit-page-crash>`),
      pageRoute('/form', form, () => html`<gemkit-page-form></gemkit-page-form>`),
      pageRoute('/guarded', guarded, () => html`<gemkit-page-guarded></gemkit-page-guarded>`),
      layoutRoute('/private/*', privateLayout, () => html`<gemkit-layout-private></gemkit-layout-private>`),
      pageRoute('/', home, () => html`<gemkit-page-index></gemkit-page-index>`),
      errorPage,
    ],
    [privateLayout.tag]: [
      pageRoute('/private/doc', doc, () => html`<gemkit-page-private-doc></gemkit-page-private-doc>`),
      errorPage,
    ],
  },
  errorPage,
);

const handledErrors: unknown[] = [];

const renderer = createRenderer({
  app: html`<gemkit-outlet></gemkit-outlet>`,
  serverModules,
  appServerModule: {
    handle: ({ path }) => {
      if (path === '/guarded') error(401, 'Unauthorized');
    },
    handleError: (err) => handledErrors.push(err),
  },
});

const documentTemplate =
  '<!doctype html><html><head><meta charset="utf-8"><title></title></head><body><!--gemkit-body--></body></html>';

const request = (path: string, init?: RequestInit) => new Request(`http://localhost${path}`, init);

async function renderPage(input: Request | string) {
  const { status, html } = await renderer.renderDocument(documentTemplate, input);
  return { status, html: (await Array.fromAsync(html)).join('') };
}

const getHead = (html: string) => html.slice(html.indexOf('<head>'), html.indexOf('</head>'));

test('meta: 合并 layout 和页面的 meta，页面覆盖同名 key', async ({ assert }) => {
  const { html } = await renderPage('/');
  assert.equal(
    getHead(html),
    '<head><meta charset="utf-8"><title>Home</title>' +
      '<meta name="description" content="Home &quot;summary&quot; &lt;b>">' +
      '<meta property="og:site_name" content="Site">',
  );
});

test('error: layout 出错时错误页面渲染在 layout 的位置，上层 layout 保留', async ({ assert }) => {
  const { status, html } = await renderPage('/private/doc');
  assert.equal(status, 403);
  assert.match(html, /<title>Error 403<\/title>/);
  assert.match(html, /<nav>nav<\/nav>/);
  assert.doesNotMatch(html, /<gemkit-layout-private|>doc</);
  assert.match(html, /<gemkit-page-error ssr-props="">.*error .*403.*Forbidden.*<\/gemkit-page-error>/s);
  // 水合时直接渲染错误页面
  assert.match(html, /"error":\{"tag":"gemkit-layout-private","status":403,"message":"Forbidden"\}/);
  // 错误页面的 meta 和上层 layout 的合并
  assert.match(
    getHead(html),
    /<meta name="description" content="Site description"><meta property="og:site_name" content="Site"><meta property="og:title" content="Forbidden">/,
  );
});

test('error: 意外的错误状态码为 500，交给 `handleError`，生产环境隐藏错误信息', async ({ assert }) => {
  handledErrors.length = 0;
  const { status, html } = await renderPage(request('/crash'));
  assert.equal(status, 500);
  assert.match(html, /error .*500.*db down/s);
  assert.deepEqual(
    handledErrors.map((err) => (err as Error).message),
    ['db down'],
  );
  // 出错页面的 meta 不再使用
  assert.doesNotMatch(html, /Crash description/);

  const { NODE_ENV } = process.env;
  process.env.NODE_ENV = 'production';
  try {
    const result = await renderPage(request('/crash'));
    assert.match(result.html, /error .*500.*Internal Error/s);
    assert.doesNotMatch(result.html, /db down/);
  } finally {
    process.env.NODE_ENV = NODE_ENV;
  }
});

test('error: 预渲染时意外的错误使构建失败', async ({ assert }) => {
  await assert.rejects(renderPage('/crash'), /db down/);
});

test('error: 没有匹配的路由时渲染错误页面，状态码为 404', async ({ assert }) => {
  const { status, html } = await renderPage('/a/b');
  assert.equal(status, 404);
  assert.match(html, /error .*404.*Not Found/s);
  assert.match(html, /<nav>nav<\/nav>/);
});

test('error: `handle` 出错时错误页面渲染在第一个有服务端模块的路由的位置', async ({ assert }) => {
  const { status, html } = await renderPage(request('/guarded'));
  assert.equal(status, 401);
  assert.match(html, /<nav>nav<\/nav>/);
  assert.match(html, /error .*401.*Unauthorized/s);
  assert.doesNotMatch(html, />guarded</);
  const { body } = await renderer.loadData(request('/guarded/__data.json'));
  assert.deepEqual(body, { data: {}, error: { tag: guarded.tag, status: 401, message: 'Unauthorized' } });
  assert.equal(await renderer.canPrerender('/guarded'), false);
});

test('loadData: 出错的路由和其他路由的数据', async ({ assert }) => {
  const { status, body } = await renderer.loadData(request('/private/doc/__data.json'));
  assert.equal(status, 200);
  assert.deepEqual(JSON.parse(JSON.stringify(body)), {
    data: { [doc.tag]: 'doc data' },
    error: { tag: privateLayout.tag, status: 403, message: 'Forbidden' },
  });
});

test('runAction: action 出错时返回错误，没有 JS 时渲染错误页面', async ({ assert }) => {
  const submit = (accept?: string) =>
    request('/form?/save', {
      method: 'POST',
      headers: { origin: 'http://localhost', ...(accept && { accept }) },
      body: new FormData(),
    });
  const { result } = await renderer.runAction(submit());
  assert.deepEqual(result, { type: 'error', error: { tag: form.tag, status: 422, message: 'Invalid' } });

  const handler = createRequestHandler(renderer, documentTemplate);
  const json = await handler(submit('application/json'));
  assert.equal(json.status, 200);
  assert.deepEqual(await json.json(), result);

  const res = await handler(submit());
  assert.equal(res.status, 422);
  assert.equal(res.headers.get('content-type'), 'text/html; charset=utf-8');
  assert.match(res.headers.get('set-cookie') || '', /draft=1/);
  assert.match(await res.text(), /error .*422.*Invalid/s);
});

test('fetchData: 数据文件不存在时（例如静态托管时没有预渲染的页面）是 404 错误', async ({ assert, mock }) => {
  mock.method(globalThis, 'fetch', async () => new Response(null, { status: 404 }));
  await assert.rejects(fetchData('/a/__data.json', '/a'), (err) => err instanceof HttpError && err.status === 404);
  mock.method(globalThis, 'fetch', async () => new Response(null, { status: 500 }));
  await assert.rejects(fetchData('/a/__data.json', '/a'), /failed to load data of `\/a`/);
});
