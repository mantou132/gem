import '../lib/shim';

import test from 'node:test';

import { createState, customElement, fallback, GemElement, html, mounted, template } from '@mantou/gem';
import { GemLightRouteElement } from '@mantou/gem/elements/route';
import { GemUseElement } from '@mantou/gem/elements/use';

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

test('提前结束读取时，之后的异步错误不会成为未处理的 rejection', async ({ assert }) => {
  const errors: unknown[] = [];
  const onRejection = (err: unknown) => errors.push(err);
  process.on('unhandledRejection', onRejection);
  const chunks = render(html`<p>head</p><app-server-error></app-server-error>`);
  await chunks.next();
  await chunks.return(undefined);
  await new Promise((resolve) => setTimeout(resolve, 10));
  process.off('unhandledRejection', onRejection);
  assert.deepEqual(errors, []);
});

@customElement('app-render-error')
export class DemoRenderErrorElement extends GemElement {
  @template()
  #render = (): never => {
    throw new Error('render failed');
  };
}

test('元素渲染出错时渲染失败', async ({ assert }) => {
  await assert.rejects(renderToString(html`<app-render-error></app-render-error>`), /render failed/);
});

@customElement('app-render-fallback')
export class DemoRenderFallbackElement extends GemElement {
  @template()
  #render = (): never => {
    throw new Error('render failed');
  };

  @fallback()
  #fallback = (err: Error) => html`<b>${err.message}</b>`;
}

test('元素渲染出错时输出 `@fallback` 的内容', async ({ assert }) => {
  const result = await renderToString(html`<app-render-fallback></app-render-fallback>`);
  assert.match(result, /<b><!--\?lit\$\d+\$-->render failed<\/b>/);
});

customElements.define('app-route', GemLightRouteElement);

test('路由加载出错时渲染失败', async ({ assert }) => {
  const routes = [{ pattern: '*', getContent: () => Promise.reject(new Error('route failed')) }];
  await assert.rejects(renderToString(html`<app-route .routes=${routes}></app-route>`), /route failed/);
});

customElements.define('app-use', GemUseElement);

test('`<gem-use>` 输出字符串内容', async ({ assert }) => {
  const result = await renderToString(html`<app-use .element=${'<svg><path d="M0"></path></svg>'}></app-use>`);
  assert.match(result, /<svg><path d="M0"><\/path><\/svg>/);
});
