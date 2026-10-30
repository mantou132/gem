// 必须在 Gem 之前执行，用来模拟 DOM 环境
import '@mantou/gem-ssr';

import test from 'node:test';

import { GemElement, html, template } from '@mantou/gem';

import { error, redirect, type ServerModule } from '../data';
import { layoutRoute, pageRoute, setOutlets } from '../outlet';
import { layout, page } from '../page';
import { createRenderer } from '../server';

@layout()
class RootLayout extends GemElement {
  @template()
  #content = () => html`<gemkit-outlet></gemkit-outlet>`;
}

@page('Editor')
class EditorPage extends GemElement {
  @template()
  #content = () => html`editor`;
}

@layout()
class DocsLayout extends GemElement {
  @template()
  #content = () => html`<gemkit-outlet></gemkit-outlet>`;
}

@page('Pair')
class PairPage extends GemElement {
  @template()
  #content = () => html`pair`;
}

const root = { tag: 'gemkit-layout-root', load: async () => ({ default: RootLayout }), server: true };
const editor = { tag: 'gemkit-page-editor', load: async () => ({ default: EditorPage }), server: true };
const docs = { tag: 'gemkit-layout-docs', load: async () => ({ default: DocsLayout }) };
const pair = { tag: 'gemkit-page-a-b', load: async () => ({ default: PairPage }), server: true };

const serverModules: Record<string, () => Promise<ServerModule>> = {
  [root.tag]: async () => ({
    prerender: false,
    load: ({ cookies }) => ({ user: cookies.get('user') ?? null }),
    // layout 的 action 对其中的页面都有效
    actions: {
      logout: ({ cookies, params }) => {
        cookies.delete('user');
        return { from: 'root', params };
      },
      rename: () => 'root',
      fail: () => error(403, 'Forbidden'),
    },
  }),
  // 等待数据时已经开始读取渲染结果
  [editor.tag]: async () => ({
    load: async ({ cookies }) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return cookies.get('user') || redirect(302, '/login');
    },
  }),
  [pair.tag]: async () => ({
    prerender: false,
    load: () => 'pair data',
    // 覆盖 layout 的同名 action
    actions: { rename: ({ params }) => params },
  }),
};

// 和生成的 `routes.ts` 一样
setOutlets({
  '': [
    layoutRoute(
      '*',
      root,
      (props) => html`<gemkit-layout-root .params=${props.params} .data=${props.data}></gemkit-layout-root>`,
    ),
  ],
  [root.tag]: [
    pageRoute(
      '/editor',
      editor,
      (params, data) => html`<gemkit-page-editor .params=${params} .data=${data}></gemkit-page-editor>`,
    ),
    // 静态片段优先，`/docs/x` 匹配 layout，不匹配 `/:a/:b`
    layoutRoute('/docs/*', docs, (props) => html`<gemkit-layout-docs .params=${props.params}></gemkit-layout-docs>`),
    pageRoute('/:a/:b', pair, (_, data) => html`<gemkit-page-a-b .data=${data}></gemkit-page-a-b>`),
  ],
  [docs.tag]: [],
});

const renderer = createRenderer({
  app: html`<gemkit-outlet></gemkit-outlet>`,
  serverModules,
});

const documentTemplate = '<!doctype html><html><head><title></title></head><body><!--gemkit-body--></body></html>';

test('renderDocument: layout 中的页面 `load` 跳转', async ({ assert }) => {
  const { status, headers } = await renderer.renderDocument(documentTemplate, new Request('http://localhost/editor'));
  assert.equal(status, 302);
  assert.equal(headers.get('location'), '/login');
});

test('renderDocument: layout 中的页面', async ({ assert }) => {
  const request = new Request('http://localhost/editor', { headers: { cookie: 'user=a' } });
  const response = await renderer.renderDocument(documentTemplate, request);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /editor/);
});

test('服务端和客户端一样逐层匹配路由', async ({ assert }) => {
  const request = new Request('http://localhost/docs/x', { headers: { cookie: 'user=a' } });
  const { status } = await renderer.renderDocument(documentTemplate, request);
  assert.equal(status, 404, '`/docs/x` 匹配 layout，layout 中没有匹配的页面');
  const getData = async (url: string) =>
    ((await (await renderer.loadData(new Request(url))).json()) as { data: Record<string, unknown> }).data;
  assert.equal(
    (await getData('http://localhost/docs/x/__data.json'))[pair.tag],
    undefined,
    '不加载 `/:a/:b` 页面的数据',
  );
  assert.equal((await getData('http://localhost/other/x/__data.json'))[pair.tag], 'pair data');
});

test('runAction: 页面和 layout 中的 action，内层覆盖外层的同名 action', async ({ assert }) => {
  const post = (url: string) =>
    renderer.runAction(
      documentTemplate,
      new Request(url, { method: 'POST', body: new FormData(), headers: { accept: 'application/json' } }),
    );
  const result = async (url: string) => (await post(url)).json();
  // layout 的参数不包括子路由的部分
  const logout = await post('http://localhost/a/b?/logout');
  assert.deepEqual(await logout.json(), { type: 'success', data: { from: 'root', params: {} } });
  assert.match(logout.headers.get('set-cookie')!, /^user=;/);
  assert.deepEqual((await result('http://localhost/editor?/logout')).type, 'success');
  // 页面覆盖 layout 的同名 action
  assert.deepEqual(await result('http://localhost/a/b?/rename'), { type: 'success', data: { a: 'a', b: 'b' } });
  assert.deepEqual(await result('http://localhost/editor?/rename'), { type: 'success', data: 'root' });
  // 出错时错误页面渲染在 layout 的位置
  assert.deepEqual(await result('http://localhost/a/b?/fail'), {
    type: 'error',
    error: { tag: root.tag, status: 403, message: 'Forbidden' },
  });
  // 没有匹配的页面时 layout 的 action 也不处理
  assert.equal((await post('http://localhost/docs/x?/logout')).status, 404);
  assert.equal((await post('http://localhost/a/b?/missing')).status, 404);
});
