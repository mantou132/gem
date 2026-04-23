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
  property,
  shadow,
  template,
} from '@mantou/gem';

import { t } from './utils';

// ---------------------------------------------------------------------------
// 辅助元素定义
// ---------------------------------------------------------------------------

// 嵌套用的内层 shadow 元素
@customElement('contract-inner')
@shadow()
export class ContractInnerElement extends GemElement {
  @attribute label: string;

  render = () => {
    return html`<span class="inner">${this.label}</span>`;
  };
}

@customElement('contract-other')
export class ContractOtherElement extends GemElement {
  render = () => {
    return html`${1} 2 ${3}`;
  };
}

// 嵌套用的外层 light 元素，包含 contract-inner
const outerStyle = css`
  :scope {
    display: block;
  }
`;

@customElement('contract-outer')
@adoptedStyle(outerStyle)
export class ContractOuterElement extends GemElement {
  @attribute title: string;
  @property items?: string[];

  #state = createState({ count: 0 });

  @template()
  #render = () => {
    return html`
      <h1>${this.title}</h1>
      ${html`<contract-other></contract-other>`}
      <contract-inner label=${this.title}></contract-inner>
      <ul>
        ${(this.items ?? []).map((item) => html`<li>${item}</li>`)}
      </ul>
      <p>count: ${this.#state.count}'s</p>
    `;
  };
}

// store 联动元素
const contractStore = createStore({ value: 'store-val' });

@customElement('contract-store')
@connectStore(contractStore)
export class ContractStoreElement extends GemElement {
  @template()
  #render = () => {
    return html`<span>${contractStore.value}</span>`;
  };
}

// ---------------------------------------------------------------------------
// 1. 基础 ChildPart 标记
// ---------------------------------------------------------------------------

test('primitive ChildPart: 文本绑定有 lit-part 注释包裹', async ({ assert: { snapshot } }) => {
  snapshot(await t(html`<span>${'hello'}</span>`));
});

test('primitive ChildPart: 文本绑定', async ({ assert: { snapshot } }) => {
  snapshot(await t(html`<span>a${'b'}c</span>`));
});

test('primitive ChildPart: 数字绑定', async ({ assert: { snapshot } }) => {
  snapshot(await t(html`<span>${42}</span>`));
});

test('primitive ChildPart: 多个并列绑定各自有独立注释', async ({ assert: { snapshot } }) => {
  snapshot(await t(html`<div>${'first'}<hr />${'second'}</div>`));
});

test('primitive ChildPart: null/undefined 绑定输出空内容但保留注释边界', async ({ assert: { snapshot } }) => {
  snapshot(await t(html`<div>${null}${undefined}</div>`));
});

// ---------------------------------------------------------------------------
// 2. 嵌套模板 / 子 TemplateResult
// ---------------------------------------------------------------------------

test('nested TemplateResult: 子模板也有 lit-part 注释', async ({ assert: { snapshot } }) => {
  const inner = html`<em>${'world'}</em>`;
  snapshot(await t(html`<div>${inner}</div>`));
});

test('nested TemplateResult: 三层嵌套', async ({ assert: { snapshot } }) => {
  const c = html`<b>${'c'}</b>`;
  const b = html`<i>${c}</i>`;
  snapshot(await t(html`<div>${b}</div>`));
});

// ---------------------------------------------------------------------------
// 3. 列表（iterable）
// ---------------------------------------------------------------------------

test('iterable ChildPart: 数组每项都有 lit-part 注释', async ({ assert: { snapshot } }) => {
  const items = ['a', 'b', 'c'];
  snapshot(await t(html`<ul>${items.map((i) => html`<li>${i}</li>`)}</ul>`));
});

test('iterable ChildPart: 空数组保留注释边界', async ({ assert: { snapshot } }) => {
  snapshot(await t(html`<ul>${([] as string[]).map((i) => html`<li>${i}</li>`)}</ul>`));
});

// ---------------------------------------------------------------------------
// 4. AttributePart / PropertyPart 标记
// ---------------------------------------------------------------------------

test('AttributePart: 动态 attribute 的元素有 data-lit-bound 标记', async ({ assert: { snapshot } }) => {
  snapshot(await t(html`<div title=${'hello'} class="static"></div>`));
});

test('AttributePart: 多个动态 attribute', async ({ assert: { snapshot } }) => {
  snapshot(await t(html`<input type="text" .value=${'val'} ?disabled=${false} />`));
});

// ---------------------------------------------------------------------------
// 5. Shadow DOM 内部标记
// ---------------------------------------------------------------------------

test('shadow DOM: shadowroot template 内有 lit-part 注释', async ({ assert: { snapshot } }) => {
  snapshot(await t(html`<contract-inner label="test"></contract-inner>`));
});

// ---------------------------------------------------------------------------
// 6. Light DOM 自定义元素（contract-outer）
// ---------------------------------------------------------------------------

test('light DOM 元素: 渲染内容有 lit-part 注释', async ({ assert: { snapshot } }) => {
  snapshot(await t(html`<contract-outer title="hello" .items=${['x', 'y']}></contract-outer>`));
});

// ---------------------------------------------------------------------------
// 7. 嵌套自定义元素（outer 包含 inner shadow）
// ---------------------------------------------------------------------------

test('nested custom elements: 外层 light + 内层 shadow 都有标记', async ({ assert: { snapshot } }) => {
  snapshot(await t(html`<contract-outer title="nested" .items=${['a', 'b']}></contract-outer>`));
});

// ---------------------------------------------------------------------------
// 8. connectStore 元素
// ---------------------------------------------------------------------------

test('connectStore 元素: store 值绑定有 lit-part 注释', async ({ assert: { snapshot } }) => {
  snapshot(await t(html`<contract-store></contract-store>`));
});

// ---------------------------------------------------------------------------
// 9. 顶层 renderToString 包裹
// ---------------------------------------------------------------------------

test('顶层输出: 整个输出被根 lit-part 注释包裹', async ({ assert: { snapshot } }) => {
  snapshot(await t(html`<span>root</span>`));
});
