import './dom';

import test from 'node:test';

import { STORES_SCRIPT_ID } from '../constants';
import { ssr } from './ssr';

import '../client';

const text = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, '');

const getStores = (html: string) => {
  const json = new RegExp(`<script type="application/json" id="${STORES_SCRIPT_ID}">(.*?)</script>`).exec(html)?.[1];
  return (json ? JSON.parse(json) : {}) as Record<string, { currentLanguage: string; currentLanguagePack: object }>;
};

const tick = () => new Promise((resolve) => setTimeout(resolve));

/** Node 的 `localStorage` 不可用，使用 Map 模拟，`Object.keys` 返回存储的 key */
const mockStorage = () => {
  const storage = new Map<string, string>();
  const value = new Proxy(
    {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
    { ownKeys: () => [...storage.keys()], getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }) },
  );
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value });
  return storage;
};

test('i18n SSR：输出使用过的模块的当前语言包，包含后备语言中的消息', async ({ assert }) => {
  const html = await ssr('i18n.ts', 'page', 'zh', true);
  assert.equal(text(html), '你好 Only en子模块');
  const stores = getStores(html);
  assert.deepEqual(stores['i18n:gem-i18n'], {
    currentLanguage: 'zh',
    currentLanguagePack: { hello: '你好', onlyEn: 'Only en' },
  });
  assert.deepEqual(stores['i18n:gem-i18n-sub'], {
    currentLanguage: 'zh',
    currentLanguagePack: { title: '子模块', onlyEn: 'Only en' },
  });
  assert.equal('i18n:gem-i18n-unused' in stores, false, '没有使用的子模块不输出');
});

test('i18n SSR：每个请求只输出这个请求使用过的模块', async ({ assert }) => {
  const stores = getStores(await ssr('i18n.ts', 'page', 'en', false));
  assert.equal(stores['i18n:gem-i18n'].currentLanguage, 'en');
  assert.equal('i18n:gem-i18n-sub' in stores, false);
});

test('i18n SSR：`ready` 等待渲染时创建的子模块加载语言包', async ({ assert }) => {
  const html = await ssr('i18n.ts', 'lateSubModule', 'zh');
  assert.equal(text(html), '后创建');
});

// 下面在客户端执行，使用第一个测试的服务端输出
test('i18n 客户端：使用服务端输出的语言包，不再加载', async ({ assert }) => {
  const container = document.createElement('div');
  container.innerHTML = await ssr('i18n.ts', 'page', 'zh', true);
  document.body.append(container);
  const { i18n, sub, loads } = await import('./fixtures/i18n');
  assert.equal(i18n.currentLanguage, 'zh');
  assert.equal(i18n.get('hello'), '你好');
  assert.equal(i18n.get('onlyEn'), 'Only en', '包含后备语言中的消息');
  assert.equal(sub.get('title'), '子模块');
  await i18n.ready;
  assert.deepEqual(loads, []);
});

test('i18n 客户端：没有服务端输出的子模块只加载当前语言', async ({ assert }) => {
  const { i18n, loads, loader } = await import('./fixtures/i18n');
  const lazy = i18n.createSubModule<{ title: string; onlyEn: string }>('lazy', {
    en: loader('lazy', 'en', { title: 'Lazy', onlyEn: 'Only en' }),
    zh: loader('lazy', 'zh', { title: '懒加载' }),
  });
  assert.equal(lazy.get('title'), '[title]', '加载完成前');
  await i18n.ready;
  assert.equal(lazy.get('title'), '懒加载');
  assert.deepEqual(loads, ['lazy:zh']);

  // 缺少消息时才加载后备语言
  assert.equal(lazy.get('onlyEn'), '[onlyEn]');
  await tick();
  assert.equal(lazy.get('onlyEn'), 'Only en');
  assert.deepEqual(loads, ['lazy:zh', 'lazy:en']);
});

test('i18n 客户端：主模块切换语言时等待子模块', async ({ assert }) => {
  const { i18n, sub } = await import('./fixtures/i18n');
  await i18n.setLanguage('en');
  assert.equal(document.documentElement.lang, 'en');
  assert.equal(sub.currentLanguage, 'en');
  assert.equal(sub.get('title'), 'Sub');

  // 子模块不修改文档的语言
  await sub.setLanguage('zh');
  assert.equal(document.documentElement.lang, 'en');
});

test('i18n 客户端：子模块只跟随自己的主模块，不缓存语言', async ({ assert }) => {
  const { I18n } = await import('@mantou/gem/helper/i18n');
  const storage = mockStorage();
  const resources = { en: { text: 'en' }, zh: { text: 'zh' } };
  const app = new I18n({ cachePrefix: 'app', cache: true, fallbackLanguage: 'en', currentLanguage: 'en', resources });
  const lib = new I18n({ cachePrefix: 'lib', fallbackLanguage: 'en', currentLanguage: 'en', resources });
  const appSub = app.createSubModule('sub', resources);
  const libSub = lib.createSubModule('sub', resources);
  storage.clear();

  await app.setLanguage('zh');
  assert.equal(appSub.get('text'), 'zh');
  assert.equal(libSub.currentLanguage, 'en', '其他主模块的子模块不受影响');
  assert.deepEqual([...storage], [['app:current', 'zh']], '子模块不缓存');
});

test('i18n 客户端：缓存语言包，加载完成前先使用缓存，加载完成后更新', async ({ assert }) => {
  const { I18n } = await import('@mantou/gem/helper/i18n');
  const storage = mockStorage();
  let version = 1;
  const create = () =>
    new I18n({
      cachePrefix: 'packs',
      cache: true,
      fallbackLanguage: 'en',
      currentLanguage: 'zh',
      resources: { en: { text: 'Hello' }, zh: async () => ({ default: { text: `你好 ${version}` } }) },
    });

  const first = create();
  assert.equal(first.get('text'), 'Hello', '没有缓存时加载完成前使用后备语言');
  await first.ready;
  assert.equal(first.get('text'), '你好 1');
  assert.equal(storage.get('packs:pack:zh'), JSON.stringify({ text: '你好 1' }));

  // 模拟刷新页面
  version = 2;
  const second = create();
  assert.equal(second.get('text'), '你好 1', '构造后同步使用缓存');
  await second.ready;
  await tick();
  assert.equal(second.get('text'), '你好 2', '加载完成后更新');
  assert.equal(storage.get('packs:pack:zh'), JSON.stringify({ text: '你好 2' }));

  // 子模块缓存语言包，不缓存语言
  const sub = second.createSubModule('sub', { en: { title: 'Sub' }, zh: async () => ({ title: '子模块' }) });
  await second.ready;
  assert.equal(sub.get('title'), '子模块');
  assert.equal(storage.has('packs-sub:pack:zh'), true);
  assert.equal(storage.has('packs-sub:current'), false);
});

test('i18n 客户端：没有开启缓存时不缓存语言包', async ({ assert }) => {
  const { I18n } = await import('@mantou/gem/helper/i18n');
  const storage = mockStorage();
  const i18n = new I18n({
    cachePrefix: 'nocache',
    fallbackLanguage: 'en',
    currentLanguage: 'zh',
    resources: { en: { text: 'Hello' }, zh: async () => ({ text: '你好' }) },
  });
  await i18n.ready;
  assert.equal(i18n.get('text'), '你好');
  assert.equal(storage.size, 0);
});
