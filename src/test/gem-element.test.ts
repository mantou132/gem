import { fixture, expect, nextFrame } from '@open-wc/testing';
import { AsyncGemElement, GemElement, html, createStore, updateStore, createCSSSheet, css, Store } from '..';

const store = createStore({
  a: 1,
});

const styles = createCSSSheet(css`
  :host {
    background: rgb(255, 0, 0);
  }
`);

class GemDemo extends GemElement {
  /** @attr */ attr: string;
  static observedAttributes = ['attr'];

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

describe('基本 gem element 测试', () => {
  it('后定义元素', async () => {
    const el = await fixture(html`
      <defer-gem-demo attr="attr" .prop=${{ value: 'prop' }}></defer-gem-demo>
    `);
    expect(el.prop.value).to.equal('prop');
    customElements.define(
      'defer-gem-demo',
      class extends GemElement {
        /** @attr */ attr: string;
        static observedAttributes = ['attr'];
        prop: { value: string };
      },
    );
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
    const el = await fixture(html`
      <gem-demo attr="attr" .prop=${{ value: 'prop' }}></gem-demo>
    `);
    expect(el).shadowDom.to.equal('attr: attr, prop: prop, state: ');
  });
  it('读取 attr', async () => {
    const el = await fixture(html`
      <gem-demo attr="attr"></gem-demo>
    `);
    expect(el.attr).to.equal('attr');
  });

  it('修改 attr', async () => {
    const el = await fixture(html`
      <gem-demo attr="attr"></gem-demo>
    `);
    expect(el.renderCount).to.equal(1);
    el.attr = 'value';
    el.attr = 'value';
    await Promise.resolve();
    expect(el.renderCount).to.equal(2);
    expect(el.attr).to.equal('value');
    expect(el).shadowDom.to.equal('attr: value, prop: , state: ');
  });

  it('读取 prop', async () => {
    const el = await fixture(html`
      <gem-demo .prop=${{ value: 'prop' }}></gem-demo>
    `);
    expect(el.prop).to.deep.equal({ value: 'prop' });
  });

  it('修改 prop', async () => {
    const el = await fixture(html`
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
    const el = await fixture(html`
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
    const el = await fixture(html`
      <gem-demo></gem-demo>
    `);
    updateStore(store, { a: ++store.a });
    updateStore(store, { a: ++store.a });
    expect(store.a).to.equal(a + 2);
    expect(el.renderCount).to.equal(1);
    await Promise.resolve();
    expect(el.renderCount).to.equal(2);
    el.disconnectStores([store]);
    updateStore(store, { a: ++store.a });
    await nextFrame();
    expect(el.renderCount).to.equal(2);
  });
});

const storeB = createStore({
  b: 1,
});
class DynGemDemo extends AsyncGemElement {
  renderCount = 0;
  render() {
    this.renderCount++;
    return html``;
  }
}
customElements.define('dyn-gem-demo', DynGemDemo);

describe('动态 store 测试', () => {
  it('动态监听', async () => {
    const el = await fixture(html`
      <dyn-gem-demo></dyn-gem-demo>
    `);
    el.connectStores([storeB]);
    updateStore(storeB, { b: ++storeB.b });
    await Promise.resolve();
    expect(el.renderCount).to.equal(1);
    await nextFrame();
    expect(el.renderCount).to.equal(2);
    el.disconnectStores([storeB]);
    updateStore(storeB, { b: ++storeB.b });
    await nextFrame();
    expect(el.renderCount).to.equal(2);
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
    const el = await fixture(html`
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

class ErrorGemDemo extends GemElement {
  static observedStores = [{}] as Store<unknown>[];
}
customElements.define('error-gem-demo', ErrorGemDemo);
describe('元素初始化错误', () => {
  it('observedStores 错误', async () => {
    expect(() => new ErrorGemDemo()).to.throw();
  });
});
