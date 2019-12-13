import { fixture, expect, nextFrame } from '@open-wc/testing';
import {
  AsyncGemElement,
  GemElement,
  html,
  createStore,
  updateStore,
  createCSSSheet,
  css,
  Store,
  attribute,
  property,
  customElement,
  connectStore,
  adoptedStyle,
  emitter,
} from '..';

const store = createStore({
  a: 1,
});

const styles = createCSSSheet(css`
  :host {
    background: rgb(255, 0, 0);
  }
`);

class GemDemo extends GemElement {
  /** @attr */ attr: string | null;
  /** @attr long-attr*/ longAttr: string;
  static observedAttributes = ['attr', 'long-attr'];

  static observedStores = [store];

  prop = { value: '' };
  static observedPropertys = ['prop'];

  static adoptedStyleSheets = [styles];
  state = { value: '' };

  renderCount = 0;

  render() {
    this.renderCount++;
    return html`
      attr: ${this.attr}, prop: ${this.prop.value}, state: ${this.state.value}
    `;
  }
}

customElements.define('gem-demo', GemDemo);

@connectStore(store)
@adoptedStyle(styles)
@customElement('decorator-gem-demo')
class DecoratorGemElement extends GemElement {
  @emitter hi: Function;
  @attribute attr: string | null;
  @property prop = { value: '' };
  renderCount = 0;
  render() {
    this.renderCount++;
    return html`
      attr: ${this.attr}, prop: ${this.prop.value}
    `;
  }
}

@connectStore(store)
@adoptedStyle(styles)
@customElement('decorator-gem-demo2')
class DecoratorGemElement2 extends GemElement {
  static observedStores = [];
  static adoptedStyleSheets = [];
  renderCount = 0;
  render() {
    this.renderCount++;
    return html``;
  }
}

class DeferGemElement extends GemElement {
  /** @attr */ attr: string | null;
  static observedAttributes = ['attr'];
  prop: { value: string };
}

describe('基本 gem element 测试', () => {
  it('后定义元素', async () => {
    const el: DeferGemElement = await fixture(html`
      <defer-gem-demo attr="attr" .prop=${{ value: 'prop' }}></defer-gem-demo>
    `);
    expect(el.prop.value).to.equal('prop');
    customElements.define('defer-gem-demo', DeferGemElement);
    await nextFrame();
    expect(el.prop.value).to.equal('prop');
    expect(el.attr).to.equal('attr');
  });
  it('adoptedStyleSheets 共享样式', async () => {
    const el = await fixture(html`
      <gem-demo attr="attr" .prop=${{ value: 'prop' }}></gem-demo>
    `);
    expect(window.getComputedStyle(el).backgroundColor).to.equal('rgb(255, 0, 0)');
  });
  it('渲染 gem element', async () => {
    const el: GemDemo = await fixture(html`
      <gem-demo attr="attr" .prop=${{ value: 'prop' }}></gem-demo>
    `);
    expect(el).shadowDom.to.equal('attr: attr, prop: prop, state: ');
    await Promise.resolve();
    expect(el.renderCount).to.equal(1);
    el.update();
    await Promise.resolve();
    expect(el.renderCount).to.equal(2);
  });
  it('读取 attr', async () => {
    const el: GemDemo = await fixture(html`
      <gem-demo attr="attr" long-attr="hi"></gem-demo>
    `);
    expect(el.attr).to.equal('attr');
    expect(el.longAttr).to.equal('hi');
  });

  it('修改 attr', async () => {
    const el: GemDemo = await fixture(html`
      <gem-demo attr="attr"></gem-demo>
    `);
    expect(el.renderCount).to.equal(1);
    el.attr = 'rrr';
    el.attr = 'value';
    await Promise.resolve();
    expect(el.renderCount).to.equal(2);
    expect(el.attr).to.equal('value');
    expect(el).shadowDom.to.equal('attr: value, prop: , state: ');
    el.attr = null;
    await Promise.resolve();
    expect(el.hasAttribute('attr')).to.equal(false);
  });

  it('读取 prop', async () => {
    const el: GemDemo = await fixture(html`
      <gem-demo .prop=${{ value: 'prop' }}></gem-demo>
    `);
    expect(el.prop).to.deep.equal({ value: 'prop' });
  });

  it('修改 prop', async () => {
    const el: GemDemo = await fixture(html`
      <gem-demo .prop=${{ value: 'prop' }}></gem-demo>
    `);
    expect(el.renderCount).to.equal(1);
    el.prop = { value: 'asdfasdfdsf' };
    el.prop = { value: 'value' };
    el.prop = { value: 'value' };
    await Promise.resolve();
    expect(el.renderCount).to.equal(2);
    expect(el.prop).to.deep.equal({ value: 'value' });
    expect(el).shadowDom.to.equal('attr: , prop: value, state: ');
  });

  it('修改 state', async () => {
    const el: GemDemo = await fixture(html`
      <gem-demo></gem-demo>
    `);
    expect(el.renderCount).to.equal(1);
    el.setState({ value: 'asfasdf' });
    el.setState({ value: 'state' });
    el.setState({ value: 'state' });
    await Promise.resolve();
    expect(el.renderCount).to.equal(2);
    expect(el.state).to.deep.equal({ value: 'state' });
    expect(el).shadowDom.to.equal('attr: , prop: , state: state');
  });

  it('更新 store', async () => {
    const a = store.a;
    const el: GemDemo = await fixture(html`
      <gem-demo></gem-demo>
    `);
    updateStore(store, { a: ++store.a });
    updateStore(store, { a: ++store.a });
    expect(store.a).to.equal(a + 2);
    expect(el.renderCount).to.equal(1);
    await Promise.resolve();
    expect(el.renderCount).to.equal(2);
  });
  it('装饰器定义的自定义元素', async () => {
    let a = 1;
    const el: DecoratorGemElement = await fixture(html`
      <decorator-gem-demo
        @hi=${(e: CustomEvent) => (a = e.detail)}
        attr="attr"
        .prop=${{ value: 'prop' }}
      ></decorator-gem-demo>
    `);
    expect(el.attr).to.equal('attr');
    expect(el.prop).to.eql({ value: 'prop' });
    expect(el).shadowDom.to.equal('attr: attr, prop: prop');
    updateStore(store, { a: 3 });
    await Promise.resolve();
    expect(el.renderCount).to.equal(2);
    el.hi(2);
    expect(el.renderCount).to.equal(2);
    expect(a).to.equal(2);
  });

  it('装饰器和静态属性共存', async () => {
    const el: DecoratorGemElement2 = await fixture(html`
      <decorator-gem-demo2></decorator-gem-demo2>
    `);
    updateStore(store, { a: 3 });
    await Promise.resolve();
    expect(el.renderCount).to.equal(2);
    expect(el.shadowRoot?.adoptedStyleSheets.length).to.equal(1);
  });
});

class AsyncGemDemo extends AsyncGemElement {
  static observedStores = [store];
  state = { a: 0 };
  renderCount = 0;
  render() {
    this.renderCount++;
    return html``;
  }
}
customElements.define('async-gem-demo', AsyncGemDemo);

describe('异步 gem element 测试', () => {
  it('异步 gem element 更新', async () => {
    const el: AsyncGemDemo = await fixture(html`
      <async-gem-demo></async-gem-demo>
    `);
    updateStore(store, { a: ++store.a });
    el.setState({ a: ++el.state.a });
    await Promise.resolve();
    expect(el.renderCount).to.equal(1);
    await nextFrame();
    expect(el.renderCount).to.equal(2);
  });
});

@customElement('light-gem-demo')
class LightGemDemo extends GemElement {
  constructor() {
    super(false);
  }
  render() {
    return html`
      hi
    `;
  }
}
describe('没有 Shadow DOM 的 gem 元素', () => {
  it('渲染没有 Shadow DOM 的 gem 元素', async () => {
    const el: LightGemDemo = await fixture(html`
      <light-gem-demo></light-gem-demo>
    `);
    expect(el.shadowRoot).to.equal(null);
    expect(el.innerHTML.includes('hi')).to.equal(true);
  });
});

class ErrorGemDemo extends GemElement {
  static observedStores = [{}] as Store<unknown>[];
}
customElements.define('error-gem-demo', ErrorGemDemo);
describe('元素初始化错误', () => {
  it('observedStores 错误', async () => {
    expect(() => new ErrorGemDemo()).to.throw();
  });
});
