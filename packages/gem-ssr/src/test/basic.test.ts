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
import type { TemplateResult } from '@mantou/gem/lib/lit-html';
import '@mantou/gem/elements/route';
import '@mantou/gem/elements/unsafe';

import { renderToString, runInRequest } from '..';
import { server } from '../decorators';
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

@customElement('app-inner-html')
@shadow()
export class DemoInnerHTMLElement extends GemElement {
  @property tpl?: TemplateResult;

  @template()
  #content = () => {
    this.shadowRoot!.innerHTML = '<b>ignored</b>';
    return this.tpl;
  };
}

test('shadowRoot.innerHTML: 模版返回 undefined 时原样输出', async ({ assert }) => {
  const result = await t(html`<gem-unsafe html="<p>a</p><style>p{}</style>"></gem-unsafe>`);
  assert.match(result, /<template [^>]*><style>[^<]*<\/style><p>a<\/p><style>p\{\}<\/style><\/template>/);
  assert.doesNotMatch(result, /<template [^>]*><style>[^<]*<\/style><!--/, '没有根标记，客户端不会水合');
});

@customElement('app-light-html')
export class DemoLightHTMLElement extends GemElement {
  @property content = '';

  @template()
  #content = () => {
    this.innerHTML = this.content;
    return undefined;
  };
}

test('innerHTML: light DOM 元素的模版返回 undefined 时原样输出', async ({ assert }) => {
  const result = await t(html`<app-light-html .content=${'<p>a</p><script>b</script>'}></app-light-html>`);
  assert.match(result, /<app-light-html><!----><p>a<\/p><script>b<\/script><\/app-light-html>/);
});

test('shadowRoot.innerHTML: 模版有返回值时忽略', async ({ assert }) => {
  const result = await t(html`<app-inner-html .tpl=${html`<i>tpl</i>`}></app-inner-html>`);
  assert.match(result, /<i>tpl<\/i>/);
  assert.doesNotMatch(result, /ignored/);
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

test('并发渲染互不影响', async ({ assert }) => {
  const results = await Promise.all([t(html`<p>${1}</p>`), t(html`<p>${2}</p>`), t(html`<p>${3}</p>`)]);
  assert.deepEqual(
    results.map((r) => r.match(/(\d)<\/p>/)?.[1]),
    ['1', '2', '3'],
  );
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

const userStore = createStore<{ nickname: string; tags?: string[] }>({ nickname: 'guest' }, 'user');
const countStore = createStore({ count: 0 }, 'count');
const localStore = createStore({ count: 0 });

@customElement('app-user')
@connectStore(userStore)
export class DemoUserElement extends GemElement {
  @template()
  #render = () => html`user: ${userStore.nickname}`;
}

// 渲染时更新 store
@customElement('app-counter')
export class DemoCounterElement extends GemElement {
  @server()
  #load = async () => {
    countStore({ count: 1 });
    localStore({ count: 1 });
  };
}

const getStoresJSON = (result: string) =>
  result.match(/<script type="application\/json" id="gem-ssr-stores">(.*?)<\/script>/)?.[1];

test('stores: 输出请求中更新过的有 key 的 store', async ({ assert }) => {
  const result = await runInRequest(() => {
    userStore({ nickname: '</script>alice', tags: ['a'] });
    return renderToString(html`<app-user></app-user><app-counter></app-counter>`);
  });
  assert.match(result, /user: <!--\?lit\$\d+\$-->&lt;\/script&gt;alice/);
  const json = getStoresJSON(result)!;
  assert.equal(json.includes('</script>'), false, '转义结束标签');
  assert.deepEqual(
    JSON.parse(json),
    { user: { nickname: '</script>alice', tags: ['a'] }, count: { count: 1 } },
    '没有 key 的 store 不输出',
  );
  assert.deepEqual({ ...userStore }, { nickname: 'guest' }, '不修改全局的值');

  const other = await renderToString(html`<app-user></app-user>`);
  assert.match(other, /user: <!--\?lit\$\d+\$-->guest/, '不影响其他请求');
  assert.equal(getStoresJSON(other), undefined, '没有更新的 store 不输出');
});
