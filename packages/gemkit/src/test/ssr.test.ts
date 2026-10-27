// 必须在 Gem 之前执行，用来模拟 DOM 环境
import '@mantou/gem-ssr';

import test from 'node:test';

import { GemElement, html, template } from '@mantou/gem';

import { DATA_SCRIPT_ID } from '../constants';
import { notFound, type ServerModule } from '../data';
import { layoutRoute, pageRoute, setOutlets } from '../outlet';
import { layout, page } from '../page';
import { createRenderer } from '../server';

@layout()
class RootLayout extends GemElement {
  @template()
  #content = () => html`<nav>root</nav><gemkit-outlet></gemkit-outlet>`;
}

@page('Home')
class HomePage extends GemElement {
  @template()
  #content = () => html`home`;
}

// `ssr = false` 的模块在服务端构建时被替换成空模块，不会加载
const clientOnly = async (): Promise<never> => {
  throw new Error('client only');
};

const root = { tag: 'gemkit-layout-root', load: async () => ({ default: RootLayout }) };
const home = { tag: 'gemkit-page-index', load: async () => ({ default: HomePage }), server: true, noLoad: true };
const play = { tag: 'gemkit-page-play', load: clientOnly, server: true, ssr: false } as const;
const app = { tag: 'gemkit-layout-app', load: clientOnly, server: true, noLoad: true, ssr: false } as const;
const settings = { tag: 'gemkit-page-app-settings', load: clientOnly, server: true, ssr: false } as const;
const missing = { tag: 'gemkit-page-app-missing', load: clientOnly, server: true, ssr: false } as const;

const serverModules: Record<string, () => Promise<ServerModule>> = {
  // 只有 `actions`，没有服务端数据
  [home.tag]: async () => ({ actions: { like: () => null } }),
  [play.tag]: async () => ({ ssr: false, load: () => ({ rom: 'mario' }) }),
  [app.tag]: async () => ({ ssr: false }),
  [settings.tag]: async () => ({ load: ({ params }) => ({ params }) }),
  [missing.tag]: async () => ({ load: () => notFound() }),
};

setOutlets({
  '': [layoutRoute('*', root, () => html`<gemkit-layout-root></gemkit-layout-root>`)],
  [root.tag]: [
    pageRoute('/play', play, () => html`<gemkit-page-play></gemkit-page-play>`),
    layoutRoute('/app/*', app, () => html`<gemkit-layout-app></gemkit-layout-app>`),
    pageRoute('/', home, () => html`<gemkit-page-index></gemkit-page-index>`),
  ],
  [app.tag]: [
    pageRoute('/app/settings', settings, () => html`<gemkit-page-app-settings></gemkit-page-app-settings>`),
    pageRoute('/app/missing', missing, () => html`<gemkit-page-app-missing></gemkit-page-app-missing>`),
  ],
});

const renderer = createRenderer({ app: html`<gemkit-outlet></gemkit-outlet>`, serverModules });

const documentTemplate = '<!doctype html><html><head><title></title></head><body><!--gemkit-body--></body></html>';

const render = async (path: string) => {
  const { status, html } = await renderer.renderDocument(documentTemplate, new Request(`http://localhost${path}`));
  return { status, html: (await Array.fromAsync(html)).join('') };
};

const getData = (html: string) =>
  JSON.parse(html.match(new RegExp(`<script type="application/json" id="${DATA_SCRIPT_ID}">(.*?)</script>`))![1]);

test('ssr = false：服务端只输出空的 outlet，`load` 的数据输出到文档中', async ({ assert }) => {
  const { status, html } = await render('/play');
  assert.equal(status, 200);
  assert.match(html, /<nav>root<\/nav>/);
  assert.doesNotMatch(html, /<gemkit-page-play/);
  assert.deepEqual(getData(html), { path: '/play', data: { [play.tag]: { rom: 'mario' } } });
  // 客户端导航时请求数据
  const { body } = await renderer.loadData(new Request('http://localhost/play/__data.json'));
  assert.deepEqual(body, { data: { [play.tag]: { rom: 'mario' } }, error: undefined });
});

test('ssr = false：在 layout 中设置时对其中的页面都有效', async ({ assert }) => {
  const { status, html } = await render('/app/settings');
  assert.equal(status, 200);
  assert.doesNotMatch(html, /<gemkit-layout-app|<gemkit-page-app-settings/);
  // 子路由也不在服务端渲染，数据一起输出
  assert.deepEqual(getData(html), { path: '/app/settings', data: { [settings.tag]: { params: {} } } });
  // 可以预渲染空的页面
  assert.deepEqual(await renderer.getPaths(), ['/play', '/', '/app/settings', '/app/missing']);
});

test('ssr = false：`load` 出错时响应它的状态码，由客户端渲染错误页面', async ({ assert }) => {
  const { status, html } = await render('/app/missing');
  assert.equal(status, 404);
  assert.deepEqual(getData(html), {
    path: '/app/missing',
    data: {},
    error: { tag: missing.tag, status: 404, message: 'Not Found' },
  });
});

test('没有服务端 `load` 的路由不输出数据', async ({ assert }) => {
  const { html } = await render('/');
  assert.match(html, /home/);
  assert.doesNotMatch(html, new RegExp(DATA_SCRIPT_ID));
  const { result } = await renderer.runAction(new Request('http://localhost/?/like', { method: 'POST' }));
  assert.deepEqual(result, { type: 'success', data: null });
});
