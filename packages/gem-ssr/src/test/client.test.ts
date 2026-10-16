import './dom';

import test from 'node:test';

import { createStore, type GemElement } from '@mantou/gem';
import { render as litRender } from '@mantou/gem/lib/lit-html';

import { defineLazy, GemServerElement, setServerElementLoader } from '../client';
import { hydrateContainer } from '../client/hydration';
import { getServerElementKey, ssrContext } from '../decorators';
import { hiddenServerElement } from './fixtures/hidden';
import { counter, type DemoServerMethodElement } from './fixtures/server';
import { ssr } from './ssr';

import '../client';

function mount(html: string) {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.append(container);
  return container;
}

test('stores: 创建有 key 的 store 时使用服务端的值', async ({ assert }) => {
  mount(await ssr('stores.ts', 'withStore', 'bob'));
  assert.equal(createStore({ nickname: 'guest' }, 'user').nickname, 'bob');
  assert.equal(createStore({ nickname: 'guest' }).nickname, 'guest', '没有 key 的 store 不恢复');
});

test('@server: 客户端恢复状态，复用节点', async ({ assert }) => {
  const html = await ssr('server.ts', 'outer');
  counter.calls = 0;
  const container = document.createElement('div');
  container.innerHTML = html;
  const b = container.querySelector('b')!;
  const i = container.querySelector('i')!;
  document.body.append(container);
  const outer = container.querySelector('app-server-outer')!;
  assert.equal(outer.hasAttribute('ssr-state'), false, '移除状态属性');
  assert.equal(container.querySelector('b'), b);
  assert.equal(container.querySelector('i'), i, '恢复状态后 v-if 分支保持一致');
  assert.equal(b.textContent, '<outer>');
  assert.equal(i.textContent, 'inner');
  assert.equal(ssrContext.restoredElements.has(outer as GemElement), true);
  await new Promise((resolve) => setTimeout(resolve));
  assert.equal(counter.calls, 0, '恢复状态后跳过首轮副作用');
  assert.equal(ssrContext.restoredElements.has(outer as GemElement), false);
});

test('@server: 恢复状态后首轮副作用之前跳过执行', async ({ assert }) => {
  const container = mount(await ssr('server.ts', 'method'));
  counter.methodCalls = 0;
  const restored = container.querySelector<DemoServerMethodElement>('app-server-method')!;
  restored.load();
  assert.equal(counter.methodCalls, 0, '恢复状态的元素跳过');
  const created = document.createElement('app-server-method') as DemoServerMethodElement;
  document.body.append(created);
  created.load();
  assert.equal(counter.methodCalls, 1, '客户端创建的元素正常执行');
  await new Promise((resolve) => setTimeout(resolve));
  restored.load();
  assert.equal(counter.methodCalls, 2, '首轮副作用之后正常执行');
});

test('纯服务端元素：首屏使用服务端内容，客户端创建时获取 HTML', async ({ assert }) => {
  const html = await ssr('server-element.ts', 'serverElement');
  const calls: unknown[][] = [];
  setServerElementLoader(async (...args) => {
    calls.push(args);
    return html;
  });
  customElements.define('app-server-element', class extends GemServerElement {});
  const container = mount(html);
  const ssrElement = container.querySelector('app-server-element')!;
  assert.equal(ssrElement.hasAttribute('ssr-server'), false);
  assert.match(ssrElement.textContent!, /a:1:loaded/);
  assert.equal(calls.length, 0, '首屏不获取');

  const element = document.createElement('app-server-element');
  element.setAttribute('text', 'a');
  Object.assign(element, { data: { n: 1 } });
  document.body.append(element);
  await new Promise((resolve) => setTimeout(resolve));
  assert.deepEqual(calls, [
    [
      getServerElementKey('app-server-element', { text: 'a' }, { data: { n: 1 } }),
      'app-server-element',
      { text: 'a' },
      { data: { n: 1 } },
    ],
  ]);
  assert.match(element.textContent!, /a:1:loaded/);

  element.setAttribute('text', 'a');
  await new Promise((resolve) => setTimeout(resolve));
  assert.equal(calls.length, 1, '设置相同的值时不获取');

  element.setAttribute('text', 'b');
  await new Promise((resolve) => setTimeout(resolve));
  assert.equal(calls.length, 2, 'attribute 改变时重新获取');
  assert.equal(calls[1][0], getServerElementKey('app-server-element', { text: 'b' }, { data: { n: 1 } }));
});

test('纯服务端元素：服务端隐藏的元素显示时获取 HTML', async ({ assert }) => {
  const html = await ssr('server-element.ts', 'hiddenServerElement', false);
  assert.doesNotMatch(html, /ssr-server/, '隐藏的元素没有服务端内容');
  const source = await ssr('server-element.ts', 'serverElement');
  let calls = 0;
  setServerElementLoader(async () => {
    calls++;
    return source;
  });
  if (!customElements.get('app-server-element')) {
    customElements.define('app-server-element', class extends GemServerElement {});
  }
  const container = mount(html);
  hydrateContainer(hiddenServerElement(false), container);
  await new Promise((resolve) => setTimeout(resolve));
  assert.equal(calls, 0, '隐藏时不获取');
  litRender(hiddenServerElement(true), container);
  await new Promise((resolve) => setTimeout(resolve));
  assert.equal(calls, 1, '显示时获取');
  assert.match(container.querySelector('app-server-element')!.textContent!, /a:1:loaded/);
  container.remove();
});

test('延时视图：交互时加载并重放事件，客户端创建时直接加载', async ({ assert }) => {
  const clicks: string[] = [];
  let loads = 0;
  class LazyElement extends HTMLElement {
    constructor() {
      super();
      this.addEventListener('click', (evt) => clicks.push((evt.target as Element).localName));
    }
  }
  // 和 `import()` 一样异步加载
  defineLazy('app-lazy', async () => {
    loads++;
    await Promise.resolve();
    customElements.define('app-lazy', LazyElement);
  });
  const container = mount('<app-lazy><button></button></app-lazy>');
  let outerClicks = 0;
  container.addEventListener('click', () => outerClicks++);
  assert.equal(customElements.get('app-lazy'), undefined, '交互前不加载');
  container.querySelector('button')!.click();
  await new Promise((resolve) => setTimeout(resolve));
  assert.equal(loads, 1);
  assert.deepEqual(clicks, ['button'], '重放触发加载的事件');
  assert.equal(outerClicks, 1, '其他监听器只收到重放的事件');

  defineLazy('app-lazy-created', async () => {
    loads++;
    customElements.define('app-lazy-created', class extends HTMLElement {});
  });
  document.body.append(document.createElement('app-lazy-created'));
  await new Promise((resolve) => setTimeout(resolve));
  assert.equal(loads, 2);
});

test('水合时模板和服务端不一致，由客户端重新渲染', async ({ assert, mock }) => {
  const warn = mock.method(console, 'warn', () => {});
  const container = mount(await ssr('mismatch.ts', 'mismatch'));
  const div = container.querySelector('app-mismatch div')!;
  await import('./fixtures/mismatch');
  assert.equal(container.querySelector('app-mismatch div'), div, '模板一致的部分复用节点');
  assert.equal(div.querySelector('p'), null);
  assert.equal(div.textContent, 'clientb');
  assert.equal(warn.mock.callCount(), 1);
});

test('父模版设置了 property 的元素在父模版水合后才渲染', async ({ assert, mock }) => {
  const warn = mock.method(console, 'warn', () => {});
  const html = await ssr('props.ts', 'props');
  assert.match(html, /<app-props-child ssr-props="">/, '标记父模版设置了 property 的元素');
  const container = mount(html);
  const b = container.querySelector('app-props-child b');
  const { renders } = await import('./fixtures/props');
  const child = container.querySelector('app-props-child')!;
  assert.deepEqual(renders, ['a'], '首次渲染就有 property');
  assert.equal(child.hasAttribute('ssr-props'), false);
  assert.equal(child.querySelector('b'), b, '复用节点');
  assert.equal(warn.mock.callCount(), 0);
});
