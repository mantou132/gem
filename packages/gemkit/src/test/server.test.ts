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

import { DATA_SCRIPT_ID } from '../constants';
import type { ServerModule } from '../data';
import { loadPage, setOutlets } from '../outlet';
import { type Params, page } from '../page';
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

@page('Not Found')
class NotFoundPage extends GemElement {
  @template()
  #content = () => html`not found`;
}

const pages: PageEntry[] = [
  { pattern: '/slow', tag: 'gemkit-page-slow', load: async () => ({ default: SlowPage }) },
  { pattern: '/posts/:id', tag: 'gemkit-page-post', load: async () => ({ default: PostPage }) },
  { pattern: '/tags/:tag', tag: 'gemkit-page-tag', load: async () => ({ default: TagPage }) },
  { pattern: '/', tag: 'gemkit-page-index', load: async () => ({ default: HomePage }) },
];

const serverModules: Record<string, () => Promise<ServerModule>> = {
  'gemkit-page-post': async () => ({
    load: ({ params, url }) => ({ id: params.id, text: '</script><b>', url: url.pathname }),
    paths: () => [{ id: '1' }, { id: '2' }],
  }),
};

// 和生成的 `routes.ts` 一样，模版中使用静态的标签名
const [slow, post, tag, index] = pages;
const notFound: PageEntry = { pattern: '*', tag: 'gemkit-page-404', load: async () => ({ default: NotFoundPage }) };
const route = ({ pattern, tag, load }: PageEntry, content: (params: Params, data: any) => TemplateResult) => ({
  pattern,
  getContent: async (params: Params) => content(params, await loadPage(load, tag, params, tag in serverModules)),
});

setOutlets({
  '': [
    route(slow, () => html`<gemkit-page-slow></gemkit-page-slow>`),
    route(post, (p, d) => html`<gemkit-page-post .params=${p} .data=${d}></gemkit-page-post>`),
    route(tag, (p) => html`<gemkit-page-tag .params=${p}></gemkit-page-tag>`),
    route(index, () => html`<gemkit-page-index></gemkit-page-index>`),
    route(notFound, () => html`<gemkit-page-404></gemkit-page-404>`),
  ],
});

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

test('loadData: 返回服务端数据', async ({ assert }) => {
  assert.deepEqual(await renderer.loadData('/posts/2/__data.json'), {
    status: 200,
    data: { 'gemkit-page-post': { id: '2', text: '</script><b>', url: '/posts/2' } },
  });
  // `url` 包含语言前缀
  assert.deepEqual(await renderer.loadData('/zh/posts/2/__data.json'), {
    status: 200,
    data: { 'gemkit-page-post': { id: '2', text: '</script><b>', url: '/zh/posts/2' } },
  });
});

test('loadData: 没有服务端 `load` 的页面返回 404', async ({ assert }) => {
  assert.deepEqual(await renderer.loadData('/__data.json'), { status: 404, data: null });
  assert.deepEqual(await renderer.loadData('/a/b/__data.json'), { status: 404, data: null });
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
