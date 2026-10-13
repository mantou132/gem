import '../lib/shim';

import test from 'node:test';

import { createState, customElement, GemElement, html, mounted, template } from '@mantou/gem';

import { render, renderToString } from '..';
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
});

test('@server: 没有服务端方法的元素不输出状态', async ({ assert }) => {
  const result = await renderToString(html`<app-server-inner></app-server-inner><p></p>`);
  assert.doesNotMatch(result.replace('<app-server-inner ssr-state', ''), /ssr-state/);
});

let resolveSlow: (v: string) => void;

@customElement('app-server-slow')
export class DemoServerSlowElement extends GemElement {
  #state = createState({ text: '' });

  @server()
  #load = async () => this.#state({ text: await new Promise<string>((resolve) => (resolveSlow = resolve)) });

  @template()
  #render = () => html`<i>${this.#state.text}</i>`;
}

test('流式输出：异步内容完成前先输出前面的内容', async ({ assert }) => {
  const iterator = render(html`<p>before</p><app-server-slow></app-server-slow><p>after</p>`);
  const first = await iterator.next();
  assert.match(first.value!, /<p>before<\/p>$/);
  resolveSlow('slow');
  let rest = '';
  for await (const chunk of iterator) rest += chunk;
  assert.match(rest, /^<app-server-slow[^>]*><!----><i><!--\?lit\$\d+\$-->slow<\/i><\/app-server-slow><p>after<\/p>$/);
});

@customElement('app-server-delay')
export class DemoServerDelayElement extends GemElement {
  @server()
  #load = () => new Promise((resolve) => setTimeout(resolve, 50));
}

test('流式输出：并行等待多个异步元素', async ({ assert }) => {
  const start = performance.now();
  await renderToString(html`<app-server-delay></app-server-delay><app-server-delay></app-server-delay>`);
  assert.equal(performance.now() - start < 90, true, '并行执行');
});

@customElement('app-server-error')
export class DemoServerErrorElement extends GemElement {
  @server()
  #load = () => Promise.reject(new Error('load failed'));
}

test('异步元素出错时渲染失败，不影响进程', async ({ assert }) => {
  const result = renderToString(html`<app-server-delay></app-server-delay><app-server-error></app-server-error>`);
  await assert.rejects(result, /load failed/);
});
