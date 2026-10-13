import './dom';

import test from 'node:test';

import type { GemElement } from '@mantou/gem';

import { hydrateStores } from '../client';
import { ssrContext } from '../decorators';
import { counter, type DemoServerMethodElement } from './fixtures/server';
import { userStore } from './fixtures/stores';
import { ssr } from './ssr';

function mount(html: string) {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.append(container);
  return container;
}

test('hydrateStores: 读取服务端的值', async ({ assert }) => {
  mount(await ssr('stores.ts', 'withStore', 'bob'));
  hydrateStores({ user: userStore });
  assert.equal(userStore.nickname, 'bob');
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
