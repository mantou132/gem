import '../lib/shim';

import test from 'node:test';

import {
  connectStore,
  createState,
  createStore,
  customElement,
  GemElement,
  history,
  html,
  template,
} from '@mantou/gem';
import { I18n } from '@mantou/gem/helper/i18n';

import { renderToString, runInRequest } from '..';
import { server } from '../decorators';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const userStore = createStore({ name: 'guest' });

@customElement('iso-user')
@connectStore(userStore)
export class IsoUserElement extends GemElement {
  #state = createState({ path: '' });

  @server()
  #load = async () => {
    await delay(Number(userStore.name.length) * 5);
    this.#state({ path: history.getParams().path });
  };

  @template()
  #render = () => html`${userStore.name}@${this.#state.path}`;
}

// 等待期间其他请求修改 store
@customElement('iso-writer')
export class IsoWriterElement extends GemElement {
  @server()
  #load = async () => {
    await delay(1);
    userStore({ name: 'writer' });
  };
}

const i18n = new I18n({
  fallbackLanguage: 'en',
  resources: { en: { hello: 'Hello' }, zh: { hello: '你好' } },
});

@customElement('iso-i18n')
export class IsoI18nElement extends GemElement {
  @server()
  #load = () => delay(i18n.currentLanguage === 'en' ? 10 : 1);

  @template()
  #render = () => html`${i18n.get('hello')}`;
}

const text = (result: string) => result.replace(/<!--[^>]*-->/g, '').replace(/<[^>]+>/g, '');

test('并发渲染：每个请求有独立的 store、history 和 location', async ({ assert }) => {
  const names = ['alice', 'bob', 'carol-long-name', 'd'];
  const results = await Promise.all(
    names.map((name) =>
      runInRequest(() => {
        userStore({ name });
        return renderToString(html`<iso-user></iso-user>`, { url: `http://localhost/${name}` });
      }),
    ),
  );
  assert.deepEqual(
    results.map((r) => text(r).split('{')[0]),
    names.map((name) => `${name}@/${name}`),
  );
  assert.equal(userStore.name, 'guest', '不修改全局的值');
});

test('并发渲染：其他请求更新 store 不影响当前请求的元素', async ({ assert }) => {
  const [a, b] = await Promise.all([
    runInRequest(() => {
      userStore({ name: 'alice' });
      return renderToString(html`<iso-user></iso-user>`);
    }),
    renderToString(html`<iso-writer></iso-writer><iso-user></iso-user>`),
  ]);
  assert.match(text(a), /^alice@\//);
  assert.match(text(b), /^writer@\//);
  assert.equal(userStore.name, 'guest');
});

test('runInRequest：在同一个请求中设置状态后渲染', async ({ assert }) => {
  const result = await runInRequest(async () => {
    userStore({ name: 'inner' });
    await delay(1);
    return renderToString(html`<iso-user></iso-user>`);
  });
  assert.match(text(result), /^inner@\//);
  assert.equal(userStore.name, 'guest');
});

test('runInRequest：请求中修改 basePath', async ({ assert }) => {
  const result = await runInRequest(() => {
    history.basePath = '/zh';
    return renderToString(html`<iso-user></iso-user>`, { url: 'http://localhost/a' });
  });
  assert.match(text(result), /^guest@\/a/);
  assert.equal(history.basePath, '');
});

test('并发渲染：每个请求有独立的 I18n 语言', async ({ assert }) => {
  const results = await Promise.all(
    ['en', 'zh'].map((lang) =>
      runInRequest(async () => {
        await i18n.setLanguage(lang);
        return renderToString(html`<iso-i18n></iso-i18n>`);
      }),
    ),
  );
  assert.deepEqual(
    results.map((r) => text(r).split('{')[0]),
    ['Hello', '你好'],
  );
  assert.equal(i18n.currentLanguage, 'en', '不修改全局的语言');
});
