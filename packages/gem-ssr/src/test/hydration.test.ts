import './dom';

import test from 'node:test';

import { render as litRender } from '@mantou/gem/lib/lit-html';

import '../client';

import { hydrateContainer } from '../client/hydration';
import * as fx from './fixtures/templates';
import { ssr } from './ssr';

const T = 'templates.ts';

async function mkContainer(name: keyof typeof fx, ...args: unknown[]) {
  const div = document.createElement('div');
  div.innerHTML = await ssr(T, name, ...args);
  return div;
}

test('hydrateContainer: 设置 container._$litPart$', async ({ assert }) => {
  const container = await mkContainer('span', 'hello');
  assert.equal((container as any)._$litPart$, undefined, '水合前无 _$litPart$');
  hydrateContainer(fx.span('hello'), container);
  assert.notEqual((container as any)._$litPart$, undefined, '水合后有 _$litPart$');
});

test('hydrateContainer: startNode 指向 DOM 里已有的 Comment("")', async ({ assert }) => {
  const container = await mkContainer('span', 'hello');
  hydrateContainer(fx.span('hello'), container);
  const part = (container as any)._$litPart$;
  assert.equal(part._$startNode.nodeType, Node.COMMENT_NODE);
  assert.equal(part._$startNode.data, '');
  assert.equal(part._$startNode.parentNode, container);
});

test('hydrateContainer: _$committedValue 是 TemplateInstance', async ({ assert }) => {
  const container = await mkContainer('span', 'hello');
  hydrateContainer(fx.span('hello'), container);
  const instance = (container as any)._$litPart$._$committedValue;
  assert.notEqual(instance._$template, undefined);
  assert.equal(Array.isArray(instance._$parts), true);
});

test('hydrateContainer: _$committedValue._$template 与 result 匹配', async ({ assert }) => {
  const result = fx.span('hello');
  const container = await mkContainer('span', 'hello');
  hydrateContainer(result, container);
  const part = (container as any)._$litPart$;
  assert.equal(part._$committedValue._$template, part._$getTemplate(result));
});

test('水合后 litRender 不重建静态 DOM 节点', async ({ assert }) => {
  const container = await mkContainer('spanTarget', 'hello');
  const spanBefore = container.querySelector('span.target');
  assert.notEqual(spanBefore, null, 'SSR HTML 应包含 span.target');
  hydrateContainer(fx.spanTarget('hello'), container);
  litRender(fx.spanTarget('hello'), container);
  assert.equal(container.querySelector('span.target'), spanBefore, 'render 后 span 节点应是同一个对象');
});

test('水合后 litRender 不重建嵌套静态节点', async ({ assert }) => {
  const container = await mkContainer('nestedStatic', 'text');
  const divBefore = container.querySelector('div');
  const pBefore = container.querySelector('p.p');
  hydrateContainer(fx.nestedStatic('text'), container);
  litRender(fx.nestedStatic('text'), container);
  assert.equal(container.querySelector('div'), divBefore, 'div 节点未被替换');
  assert.equal(container.querySelector('p.p'), pBefore, 'p 节点未被替换');
});

test('水合后 litRender 能更新动态文本', async ({ assert }) => {
  const container = await mkContainer('span', 'before');
  hydrateContainer(fx.span('before'), container);
  litRender(fx.span('after'), container);
  assert.equal(container.querySelector('span')?.textContent, 'after');
});

test('水合后 litRender 能更新多个并列 ChildPart', async ({ assert }) => {
  const container = await mkContainer('twoParts', 'A', 'B');
  const divBefore = container.querySelector('div');
  const hrBefore = container.querySelector('hr');
  const textBefore = divBefore?.childNodes[1];
  hydrateContainer(fx.twoParts('X', 'Y'), container);
  const expected = /^<!--\?lit\$\d+\$-->X<!--\/lit--><hr><!--\?lit\$\d+\$-->Y$/;
  assert.match(container.querySelector('div')!.innerHTML, expected, '水合即首次渲染，不一致的值会被修正');
  assert.equal(container.querySelector('div')?.childNodes[1], textBefore, '文本节点被复用');
  litRender(fx.twoParts('X', 'Y'), container);
  assert.match(container.querySelector('div')!.innerHTML, expected, '更新渲染，不改变结构');
  assert.equal(container.querySelector('div'), divBefore, 'div 未被替换');
  assert.equal(container.querySelector('hr'), hrBefore, 'hr 未被替换');
});

test('水合嵌套 TemplateResult', async ({ assert }) => {
  const container = await mkContainer('nested', 'hello');
  const divBefore = container.querySelector('div');
  const emBefore = container.querySelector('em');
  hydrateContainer(fx.nested('world'), container);
  litRender(fx.nested('world'), container);
  assert.equal(container.querySelector('div'), divBefore, 'div 节点未被替换');
  assert.equal(container.querySelector('em'), emBefore, 'em 节点未被替换');
  assert.equal(emBefore?.textContent, 'world');
});

test('水合 light DOM 自定义元素的渲染容器', async ({ assert }) => {
  const container = await mkContainer('lightElement');
  const el = container.querySelector('hydration-light')!;
  const spanBefore = el.querySelector('span.label');
  assert.notEqual(spanBefore, null);
  document.body.append(container);
  assert.equal(el.querySelector('span.label'), spanBefore, '挂载后复用节点');
  container.remove();
});

test('hydrateContainer: 幂等——多次调用不崩溃', async ({ assert }) => {
  const container = await mkContainer('span', 'hello');
  hydrateContainer(fx.span('hello'), container);
  assert.doesNotThrow(() => hydrateContainer(fx.span('hello'), container));
});

test('水合 v-if 链：保留显示的分支，可以切换分支', async ({ assert }) => {
  const container = await mkContainer('condition', false);
  const [a, b] = container.querySelectorAll('p');
  hydrateContainer(fx.condition(false), container);
  assert.equal(container.querySelector('div')?.textContent, 'B', '隐藏的分支被移除');
  assert.equal(container.querySelector('p'), b, '显示的分支被复用');
  assert.equal(b.hasAttribute('v-else'), false);
  litRender(fx.condition(true), container);
  assert.equal(container.querySelector('p'), a, '切换后使用 SSR 的分支');
  assert.equal(a.getAttribute('style'), 'color: red;', '恢复原始样式');
  assert.equal(a.hasAttribute('ssr-hidden'), false);
});

test('水合列表：复用列表项，可以增删', async ({ assert }) => {
  const container = await mkContainer('list', ['a', 'b']);
  const [a, b] = container.querySelectorAll('li');
  hydrateContainer(fx.list(['a', 'b']), container);
  litRender(fx.list(['a', 'x', 'c']), container);
  const lis = container.querySelectorAll('li');
  assert.equal(lis[0], a);
  assert.equal(lis[1], b);
  assert.deepEqual(
    [...lis].map((e) => e.textContent),
    ['a', 'x', 'c'],
  );
  litRender(fx.list(['y']), container);
  assert.deepEqual(
    [...container.querySelectorAll('li')].map((e) => e.textContent),
    ['y'],
  );
});

test('水合嵌套模板：part 不会覆盖后面的静态文本', async ({ assert }) => {
  const container = await mkContainer('nestedTail', 'x');
  hydrateContainer(fx.nestedTail('x'), container);
  litRender(fx.nestedTail('y'), container);
  assert.equal(container.querySelector('b')?.textContent, 'y tail');
});

test('水合绑定事件', async ({ assert }) => {
  let count = 0;
  const container = await mkContainer('button');
  hydrateContainer(
    fx.button(() => count++),
    container,
  );
  container.querySelector('button')!.click();
  assert.equal(count, 1);
});

test('水合时忽略 light DOM 元素中的样式', async ({ assert }) => {
  const container = await mkContainer('styledChild', 'a', 'b');
  assert.notEqual(container.querySelector('hydration-styled > style'), null, '输出样式');
  const [i, b] = [container.querySelector('i'), container.querySelector('b')];
  hydrateContainer(fx.styledChild('a', 'b'), container);
  litRender(fx.styledChild('x', 'y'), container);
  assert.equal(container.querySelector('i'), i);
  assert.equal(container.querySelector('b'), b);
  assert.deepEqual([i?.textContent, b?.textContent], ['x', 'y']);
});

test('水合模板为 null 的元素', async ({ assert }) => {
  const container = await mkContainer('nullTemplate', 'a');
  const p = container.querySelector('p');
  document.body.append(container);
  hydrateContainer(fx.nullTemplate('a'), container);
  litRender(fx.nullTemplate('b'), container);
  assert.equal(container.querySelector('p'), p);
  assert.equal(p?.textContent, 'b');
  container.remove();
});
