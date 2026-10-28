import './dom';

import test from 'node:test';

import { ssr } from './ssr';

test('devtools: 记录水合的容器和不一致的位置', async ({ assert, mock }) => {
  mock.method(console, 'warn', () => {});
  // devtools 在页面脚本执行前注入
  const hook = {} as GemDevToolsHook;
  globalThis.__GEM_DEVTOOLS__HOOK__ = hook;
  await import('../client');
  const { hydrated } = hook.ssr!;
  const container = document.createElement('div');
  container.innerHTML = await ssr('mismatch.ts', 'mismatch');
  document.body.append(container);
  await import('./fixtures/mismatch');
  const ele = container.querySelector('app-mismatch')!;
  const mismatches = hydrated.get(ele.shadowRoot || ele)!;
  assert.equal(mismatches.length, 1);
  assert.equal(mismatches[0].node, ele.querySelector('div'));
  assert.equal(mismatches[0].reason, 'template');
  assert.match(mismatches[0].template, /<ul>/);
});
