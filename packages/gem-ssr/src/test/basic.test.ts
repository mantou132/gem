import '../lib/shim';

import test from 'node:test';

import {
  adoptedStyle,
  attribute,
  connectStore,
  createState,
  createStore,
  css,
  customElement,
  GemElement,
  html,
  mounted,
  property,
  shadow,
  template,
} from '@mantou/gem';

import '@mantou/gem/elements/route';

import { renderToString } from '..';
import { t } from './utils';

const style = css`
  :scope {
    font-size: medium;
  }
`;
const store = createStore({ count: 2 });

@customElement('app-light-demo')
@connectStore(store)
@adoptedStyle(style)
export class DemoLightElement extends GemElement {
  @attribute attr: string;
  @property prop?: any;

  #state = createState({ count: 1 });

  @mounted()
  #mounted = () => {
    throw new Error("should't exec");
  };

  @template()
  #render = () => {
    return html`
      light dom
      <div>attr: ${this.attr}</div>
      <div>prop: ${this.prop}</div>
      <div>state: ${this.#state.count}</div>
      <div>store: ${store.count}</div>
    `;
  };
}

test('basic light', async ({ assert: { snapshot } }) => {
  snapshot(await t(html`<app-light-demo attr="attr" .prop=${'prop'}></app-light-demo>`));
});

@customElement('app-shadow-demo')
@shadow()
export class DemoShadowElement extends GemElement {
  mounted = () => {
    throw new Error("should't exec");
  };

  render = () => {
    return html`shadow dom`;
  };
}

test('basic shadow', async ({ assert: { snapshot } }) => {
  snapshot(await t(html`<app-shadow-demo></app-shadow-demo>`));
});

test('basic nested', async ({ assert: { snapshot } }) => {
  snapshot(await t(html`<div>${html`<em>${'hello'}</em>`}</div>`));
});

test('多次渲染互不影响', async ({ assert }) => {
  const tpl = (v: boolean) => html`<p v-if=${v}>A</p><p v-else>B</p>`;
  const show = (s: string) => s.match(/<p( v-else="")?>(\w)<\/p>/)?.[2];
  assert.equal(show(await t(tpl(true))), 'A');
  assert.equal(show(await t(tpl(true))), 'A');
  assert.equal(show(await t(tpl(false))), 'B');
});

test('并发渲染不影响全局环境', async ({ assert }) => {
  const { setTimeout, Promise: NativePromise } = globalThis;
  const results = await NativePromise.all([t(html`<p>${1}</p>`), t(html`<p>${2}</p>`), t(html`<p>${3}</p>`)]);
  assert.deepEqual(
    results.map((r) => r.match(/(\d)<\/p>/)?.[1]),
    ['1', '2', '3'],
  );
  assert.equal(globalThis.setTimeout, setTimeout);
  assert.equal(globalThis.Promise, NativePromise);
});

const routeStyle = css`
  :scope {
    color: red;
  }
`;

@customElement('app-route-content')
@adoptedStyle(routeStyle)
export class DemoRouteContentElement extends GemElement {
  @template()
  #render = () => html`route content`;
}

test('等待异步路由，输出路由内容的样式', async ({ assert }) => {
  const outer = [
    {
      pattern: '*',
      getContent: async () => html`<gem-light-route .routes=${inner}></gem-light-route>`,
    },
  ];
  const inner = [{ pattern: '*', getContent: async () => html`<app-route-content></app-route-content>` }];
  const result = await t(html`<gem-light-route .routes=${outer}></gem-light-route>`);
  assert.match(result, /<app-route-content>.*route content.*<\/app-route-content>/s);
  assert.match(result, /color: red/);
});

const userStore = createStore<{ nickname: string; tags?: string[] }>({ nickname: 'guest' });

@customElement('app-user')
@connectStore(userStore)
export class DemoUserElement extends GemElement {
  @template()
  #render = () => html`user: ${userStore.nickname}`;
}

test('stores: 使用请求的 store 值，输出到页面，渲染后恢复', async ({ assert }) => {
  const result = await renderToString(html`<app-user></app-user>`, {
    stores: { user: [userStore, { nickname: '</script>alice', tags: ['a'] }] },
  });
  assert.match(result, /user: <!--\?lit\$\d+\$-->&lt;\/script&gt;alice/);
  const json = result.match(/<script type="application\/json" id="gem-ssr-stores">(.*?)<\/script>/)![1];
  assert.equal(json.includes('</script>'), false, '转义结束标签');
  assert.deepEqual(JSON.parse(json), { user: { nickname: '</script>alice', tags: ['a'] } });
  assert.deepEqual({ ...userStore }, { nickname: 'guest' }, '恢复原来的值');

  const other = await renderToString(html`<app-user></app-user>`, { stores: { user: [userStore] } });
  assert.match(other, /user: <!--\?lit\$\d+\$-->guest/, '不影响其他请求');
});
