// 必须在 Gem 之前执行，用来模拟 DOM 环境
import '@mantou/gem-ssr';

import test from 'node:test';

import { GemElement, html, template } from '@mantou/gem';
import { I18n } from '@mantou/gem/helper/i18n';

import type { ServerModule } from '../data';
import { localizePath, matchLanguage, parseAcceptLanguage, splitLanguage } from '../i18n';
import { pageRoute, setOutlets } from '../outlet';
import { page } from '../page';
import { createRenderer } from '../server';

@page('Home')
class HomePage extends GemElement {
  @template()
  #content = () => html`home`;
}

type PostData = { id: string; text: string };

// `load` 读取路由参数和服务端数据，`title` 读取 `load` 的结果
@page<{ id: string }, PostData>({
  load: ({ params, data }) => ({ id: params.id, text: data.text }),
  title: ({ data }) => `Post ${data.id} ${data.text}`,
})
class PostPage extends GemElement {
  @template()
  #content = () => html`post`;
}

const home = { tag: 'gemkit-page-index', load: async () => ({ default: HomePage }) };
const post = { tag: 'gemkit-page-post', load: async () => ({ default: PostPage }), server: true };

const serverModules: Record<string, () => Promise<ServerModule>> = {
  // 中文只翻译了部分文章
  [post.tag]: async () => ({
    load: ({ params }) => ({ text: `text ${params.id}` }),
    paths: ({ lang }) => (lang === 'zh' ? [{ id: '1' }] : [{ id: '1' }, { id: '2' }]),
  }),
};

setOutlets({
  '': [
    pageRoute('/', home, () => html`<gemkit-page-index></gemkit-page-index>`),
    pageRoute('/posts/:id', post, () => html`<gemkit-page-post></gemkit-page-post>`),
  ],
});

const renderer = createRenderer({
  app: html`<gemkit-outlet></gemkit-outlet>`,
  serverModules,
  i18n: new I18n({ resources: { en: {}, zh: {} }, fallbackLanguage: 'en' }),
  languages: ['en', 'zh'],
  defaultLanguage: 'en',
  prefixDefaultLanguage: true,
});

const documentTemplate = '<!doctype html><html><head><title></title></head><body><!--gemkit-body--></body></html>';

test('splitLanguage: 默认语言也使用路径前缀', ({ assert }) => {
  const languages = ['en', 'zh'];
  assert.deepEqual(splitLanguage('/en/a', languages, 'en', true), { lang: 'en', path: '/a' });
  assert.deepEqual(splitLanguage('/en', languages, 'en', true), { lang: 'en', path: '/' });
  // 没有前缀的路径属于默认语言
  assert.deepEqual(splitLanguage('/a', languages, 'en', true), { lang: 'en', path: '/a' });
  assert.deepEqual(splitLanguage('/en/a', languages, 'en'), { lang: 'en', path: '/en/a' });
  assert.equal(localizePath('en', '/', 'en', true), '/en');
  assert.equal(localizePath('en', '/a', 'en', true), '/en/a');
  assert.equal(localizePath('en', '/a', 'en'), '/a');
});

test('matchLanguage: 按偏好顺序匹配完整的代码和主语言', ({ assert }) => {
  assert.deepEqual(parseAcceptLanguage('en;q=0.8, zh-CN,zh;q=0.9,*;q=0.5,fr;q=0'), ['zh-CN', 'zh', 'en']);
  assert.equal(matchLanguage([undefined, 'zh-CN', 'en'], ['en', 'zh']), 'zh');
  assert.equal(matchLanguage(['fr'], ['en', 'zh']), undefined);
});

test('renderDocument: 没有语言前缀时跳转到用户的语言', async ({ assert }) => {
  for (const [url, location, headers] of [
    ['/', '/en', {}],
    ['/posts/1?a=1', '/en/posts/1?a=1', {}],
    ['/', '/zh', { 'accept-language': 'fr,zh-CN;q=0.9' }],
    // 用户上次使用的语言优先
    ['/posts/1', '/en/posts/1', { 'accept-language': 'zh', cookie: 'gemkit-lang=en' }],
  ] as const) {
    const request = new Request(`http://localhost${url}`, { headers });
    const result = await renderer.renderDocument(documentTemplate, request);
    assert.equal(result.status, 302);
    assert.equal(result.headers.get('location'), location);
    assert.equal(result.headers.get('cache-control'), 'private, no-store');
  }
  for (const url of ['/en', '/en/', '/zh', '/en/posts/1']) {
    const { status } = await renderer.renderDocument(documentTemplate, new Request(`http://localhost${url}`));
    assert.equal(status, 200, url);
  }
});

test('renderDocument: `load` 和 `title` 的上下文', async ({ assert }) => {
  const { html } = await renderer.renderDocument(documentTemplate, new Request('http://localhost/zh/posts/1'));
  let content = '';
  for await (const chunk of html) content += chunk;
  assert.match(content, /<title>Post 1 text 1<\/title>/);
  assert.match(content, /"gemkit-page-post":\{"id":"1","text":"text 1"\}/);
});

test('getPaths: 每个语言分别获取动态路由参数，没有前缀的路径用于输出跳转页面', async ({ assert }) => {
  assert.deepEqual(await renderer.getPaths(), [
    '/en',
    '/en/posts/1',
    '/en/posts/2',
    '/',
    '/posts/1',
    '/posts/2',
    '/zh',
    '/zh/posts/1',
  ]);
});

test('notFoundPath: 预渲染 404 页面使用默认语言的路径，不会跳转', async ({ assert }) => {
  assert.equal(renderer.notFoundPath, '/en/__gemkit_404__');
  assert.equal((await renderer.renderDocument(documentTemplate, renderer.notFoundPath)).status, 404);
});

test('renderDocument: 预渲染没有前缀的路径时输出选择语言的脚本，只包含页面存在的语言', async ({ assert }) => {
  await renderer.getPaths();
  for (const [pathname, targets] of [
    ['/', '{"en":"/en","zh":"/zh"}'],
    ['/posts/2', '{"en":"/en/posts/2"}'],
  ]) {
    const { status, headers, html } = await renderer.renderDocument(documentTemplate, pathname);
    assert.equal(status, 302);
    assert.equal(headers.get('location'), pathname === '/' ? '/en' : `/en${pathname}`);
    assert.equal(headers.get('cache-control'), null);
    const script = (await Array.fromAsync(html)).join('');
    assert.equal(script.includes(`const p=${targets};`), true);
  }
});
