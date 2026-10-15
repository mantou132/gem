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

const root = { tag: 'gemkit-layout-root', load: async () => ({ default: RootLayout }), server: true };
const editor = { tag: 'gemkit-page-editor', load: async () => ({ default: EditorPage }), server: true };

const serverModules: Record<string, () => Promise<ServerModule>> = {
  [root.tag]: async () => ({ prerender: false, load: ({ cookies }) => ({ user: cookies.get('user') ?? null }) }),
  // 等待数据时已经开始读取渲染结果
  [editor.tag]: async () => ({
    load: async ({ cookies }) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return cookies.get('user') || redirect(302, '/login');
    },
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
  ],
});

const renderer = createRenderer({
  app: html`<gemkit-outlet></gemkit-outlet>`,
  pages: [{ pattern: '/editor', ...editor }],
  layouts: [{ pattern: '*', ...root }],
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
