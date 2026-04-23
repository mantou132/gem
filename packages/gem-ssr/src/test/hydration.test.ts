import '../lib/shim';

import test from 'node:test';

import { html as litHtml, render as litRender } from '@mantou/gem/lib/lit-html';

import { renderToString } from '..';
import { hydrateContainer } from '../client/hydration';
import { t } from './utils';

function mkContainer(ssrHtml: string): HTMLDivElement {
  const div = document.createElement('div');
  div.innerHTML = ssrHtml;
  return div;
}

test('hydrateContainer: 设置 container._$litPart$', async ({ assert }) => {
  const result = litHtml`<span>${'hello'}</span>`;
  const container = mkContainer(await renderToString(result));
  assert.equal((container as any)._$litPart$, undefined, '水合前无 _$litPart$');
  hydrateContainer(result, container);
  assert.notEqual((container as any)._$litPart$, undefined, '水合后有 _$litPart$');
});

test('hydrateContainer: startNode 指向 DOM 里已有的 Comment("")', async ({ assert }) => {
  const result = litHtml`<span>${'hello'}</span>`;
  const container = mkContainer(await renderToString(result));
  hydrateContainer(result, container);
  const part = (container as any)._$litPart$;
  assert.equal(part._$startNode.nodeType, Node.COMMENT_NODE);
  assert.equal(part._$startNode.data, '');
  assert.equal(part._$startNode.parentNode, container);
});

test('hydrateContainer: _$committedValue 是 TemplateInstance', async ({ assert }) => {
  const result = litHtml`<span>${'hello'}</span>`;
  const container = mkContainer(await renderToString(result));
  hydrateContainer(result, container);
  const part = (container as any)._$litPart$;
  const instance = part._$committedValue;
  assert.notEqual(instance, undefined);
  assert.notEqual(instance._$template, undefined);
  assert.equal(Array.isArray(instance._$parts), true);
});

test('hydrateContainer: _$committedValue._$template 与 result 匹配', async ({ assert }) => {
  const result = litHtml`<span>${'hello'}</span>`;
  const container = mkContainer(await renderToString(result));
  hydrateContainer(result, container);
  const part = (container as any)._$litPart$;
  const expectedTemplate = part._$getTemplate(result);
  assert.equal(part._$committedValue._$template, expectedTemplate);
});

test('水合后 litRender 不重建静态 DOM 节点', async ({ assert }) => {
  const result = litHtml`<span class="target">${'hello'}</span>`;
  const container = mkContainer(await renderToString(result));
  const spanBefore = container.querySelector('span.target');
  assert.notEqual(spanBefore, null, 'SSR HTML 应包含 span.target');
  hydrateContainer(result, container);
  litRender(result, container);
  const spanAfter = container.querySelector('span.target');
  assert.equal(spanBefore, spanAfter, 'render 后 span 节点应是同一个对象');
});

test('水合后 litRender 不重建嵌套静态节点', async ({ assert }) => {
  const result = litHtml`<div><p class="p">${'text'}</p></div>`;
  const container = mkContainer(await renderToString(result));
  const divBefore = container.querySelector('div');
  const pBefore = container.querySelector('p.p');
  hydrateContainer(result, container);
  litRender(result, container);
  assert.equal(container.querySelector('div'), divBefore, 'div 节点未被替换');
  assert.equal(container.querySelector('p.p'), pBefore, 'p 节点未被替换');
});

test('水合后 litRender 能更新动态文本', async ({ assert }) => {
  const result1 = litHtml`<span>${'before'}</span>`;
  const container = mkContainer(await renderToString(result1));
  hydrateContainer(result1, container);
  litRender(litHtml`<span>${'after'}</span>`, container);
  assert.equal(
    container.querySelector('span')?.textContent?.includes('after'),
    true,
    `文本应更新为 after，实际: ${container.querySelector('span')?.textContent}`,
  );
});

test('水合后 litRender 能更新多个并列 ChildPart', async ({ assert }) => {
  const result = litHtml`<div>${'A'}<hr />${'B'}</div>`;
  const container = mkContainer(await t(result));
  const divBefore = container.querySelector('div');
  const hrBefore = container.querySelector('hr');
  const r = litHtml`<div>${'X'}<hr />${'Y'}</div>`;
  hydrateContainer(r, container);
  assert.equal(
    container.querySelector('div')?.innerHTML,
    '<!--?lit$000$-->A<!--/lit--><hr><!--?lit$000$-->B',
    '水合后 DOM 没有更改',
  );
  litRender(r, container);
  assert.equal(
    container.querySelector('div')?.innerHTML,
    '<!--?lit$000$-->X<!--/lit--><hr><!--?lit$000$-->Y',
    '更新渲染，不改变结构',
  );

  // 静态节点未被替换
  assert.equal(container.querySelector('div'), divBefore, 'div 未被替换');
  assert.equal(container.querySelector('hr'), hrBefore, 'hr 未被替换');
});

test('水合嵌套 TemplateResult', async ({ assert }) => {
  const inner = litHtml`<em>${'hello'}</em>`;
  const result = litHtml`<div>${inner}</div>`;
  const ssrHtml = await renderToString(result);

  const container = mkContainer(ssrHtml);
  const divBefore = container.querySelector('div');
  const emBefore = container.querySelector('em');

  // 使用相同的模板结构进行水合
  const inner2 = litHtml`<em>${'world'}</em>`;
  const result2 = litHtml`<div>${inner2}</div>`;
  hydrateContainer(result2, container);
  litRender(result2, container);

  // 静态节点未被替换
  assert.equal(container.querySelector('div'), divBefore, 'div 节点未被替换');
  assert.equal(container.querySelector('em'), emBefore, 'em 节点未被替换');
});

test('水合 light DOM 自定义元素的渲染容器', async ({ assert }) => {
  const { customElement, GemElement, attribute, template: gemTemplate, html } = await import('@mantou/gem');

  @customElement('hydration-light-test')
  class HydrationLightTest extends GemElement {
    @attribute label = '';

    @gemTemplate()
    #render = () => html`<span class="label">${this.label}</span>`;
  }

  const ssrHtml = await renderToString(litHtml`<hydration-light-test label="hi"></hydration-light-test>`);
  const container = mkContainer(ssrHtml);
  const el = container.querySelector<HTMLElement>('hydration-light-test')!;
  assert.notEqual(el, null, '应有 hydration-light-test 元素');
  const spanBefore = el.querySelector('span.label');
  const innerResult = html`<span class="label">${'hi'}</span>`;
  hydrateContainer(innerResult, el);
  litRender(innerResult, el);
  assert.equal(el.querySelector('span.label'), spanBefore, 'span.label 节点未被替换');
});

test('hydrateContainer: 幂等——多次调用不崩溃', async ({ assert }) => {
  const result = litHtml`<span>${'hello'}</span>`;
  const container = mkContainer(await renderToString(result));
  hydrateContainer(result, container);
  assert.doesNotThrow(() => hydrateContainer(result, container));
});
