// 必须在 Gem 之前执行，用来模拟 DOM 环境
import '@mantou/gem-ssr';

import test from 'node:test';

import { GemElement, html, template } from '@mantou/gem';

import { redirect, type ServerModule } from '../data';
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
  [root.tag]: async () => ({ prerender: false, load: ({ cookies }) => ({ user: cookies.get('user') ?? null }) }),
  // 等待数据时已经开始读取渲染结果
  [editor.tag]: async () => ({
    load: async ({ cookies }) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return cookies.get('user') || redirect(302, '/login');
    },
  }),
  [pair.tag]: async () => ({ prerender: false, load: () => 'pair data' }),
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
    pageRoute('/:a/:b', pair, (params, data) => html`<gemkit-page-a-b .data=${data}></gemkit-page-a-b>`),
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
  const { status, html } = await renderer.renderDocument(documentTemplate, request);
  assert.equal(status, 200);
  assert.match((await Array.fromAsync(html)).join(''), /editor/);
});

test('服务端和客户端一样逐层匹配路由', async ({ assert }) => {
  const request = new Request('http://localhost/docs/x', { headers: { cookie: 'user=a' } });
  const { status } = await renderer.renderDocument(documentTemplate, request);
  assert.equal(status, 404, '`/docs/x` 匹配 layout，layout 中没有匹配的页面');
  const getData = async (url: string) =>
    ((await renderer.loadData(new Request(url))).body as { data: Record<string, unknown> }).data;
  assert.equal(
    (await getData('http://localhost/docs/x/__data.json'))[pair.tag],
    undefined,
    '不加载 `/:a/:b` 页面的数据',
  );
  assert.equal((await getData('http://localhost/other/x/__data.json'))[pair.tag], 'pair data');
});
