import '../lib/shim';

import test from 'node:test';

import { createState, customElement, GemElement, html, mounted, template } from '@mantou/gem';

import { renderToString } from '..';
import { server, ssrContext } from '../decorators';

let calls = 0;

@customElement('app-server-inner')
export class DemoServerInnerElement extends GemElement {
  #state = createState({ text: '' });

  @server()
  @mounted()
  #load = async () => {
    calls++;
    this.#state({ text: await Promise.resolve('inner') });
  };

  @template()
  #render = () => html`<i>${this.#state.text}</i>`;
}

let methodCalls = 0;

@customElement('app-server-method')
export class DemoServerMethodElement extends GemElement {
  @server()
  load = () => {
    methodCalls++;
  };
}

@customElement('app-server-outer')
export class DemoServerOuterElement extends GemElement {
  #state = createState({ loaded: false, text: '' });

  @server()
  @mounted()
  #load = async () => {
    calls++;
    await new Promise((resolve) => setTimeout(resolve, 10));
    this.#state({ loaded: true, text: '<outer>' });
  };

  @template()
  #render = () => html`
    <b>${this.#state.text}</b>
    <app-server-inner v-if=${this.#state.loaded}></app-server-inner>
  `;
}

test('@server: 等待执行完成，包括新渲染的元素，并输出状态', async ({ assert }) => {
  calls = 0;
  const result = await renderToString(html`<app-server-outer></app-server-outer>`);
  assert.equal(calls, 2);
  assert.match(result, /<b><!--\?lit\$\d+\$-->&lt;outer&gt;<\/b>/);
  assert.match(result, /<i><!--\?lit\$\d+\$-->inner<\/i>/);
  assert.match(
    result,
    /<app-server-outer ssr-state="\[{&quot;loaded&quot;:true,&quot;text&quot;:&quot;<outer>&quot;}\]">/,
  );
  assert.match(result, /<app-server-inner ssr-state="\[{&quot;text&quot;:&quot;inner&quot;}\]">/);
  assert.equal(ssrContext.tasks.size, 0, '渲染后清空');
});

test('@server: 没有服务端方法的元素不输出状态', async ({ assert }) => {
  const result = await renderToString(html`<app-server-inner></app-server-inner><p></p>`);
  assert.doesNotMatch(result.replace('<app-server-inner ssr-state', ''), /ssr-state/);
});

// 会设置水合引擎，放在最后
test('@server: 客户端恢复状态，复用节点', async ({ assert }) => {
  const ssr = await renderToString(html`<app-server-outer></app-server-outer>`);
  ssrContext.isServer = false;
  await import('../client');
  calls = 0;
  const container = document.createElement('div');
  container.innerHTML = ssr;
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
  assert.equal(calls, 0, '恢复状态后跳过首轮副作用');
  assert.equal(ssrContext.restoredElements.has(outer as GemElement), false);
});

// SSR 环境不执行副作用，直接调用方法
test('@server: 恢复状态后首轮副作用之前跳过执行', async ({ assert }) => {
  ssrContext.isServer = true;
  const ssr = await renderToString(html`<app-server-method></app-server-method>`);
  ssrContext.isServer = false;
  methodCalls = 0;
  const container = document.createElement('div');
  container.innerHTML = ssr;
  document.body.append(container);
  const restored = container.querySelector<DemoServerMethodElement>('app-server-method')!;
  restored.load();
  assert.equal(methodCalls, 0, '恢复状态的元素跳过');
  const created = document.createElement('app-server-method') as DemoServerMethodElement;
  document.body.append(created);
  created.load();
  assert.equal(methodCalls, 1, '客户端创建的元素正常执行');
  await new Promise((resolve) => setTimeout(resolve));
  restored.load();
  assert.equal(methodCalls, 2, '首轮副作用之后正常执行');
});
