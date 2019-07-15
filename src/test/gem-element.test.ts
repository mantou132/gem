import { fixture, expect, aTimeout } from '@open-wc/testing';
import { AsyncGemElement, GemElement, html, createStore, updateStore } from '..';

const store = createStore({
  a: 1,
});

class GemDemo extends GemElement {
  /** @attr */ attr: string;
  static observedAttributes = ['attr'];

  static observedStores = [store];

  prop = { value: '' };
  static observedPropertys = ['prop'];

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
    el.attr = 'value';
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
    el.prop = { value: 'value' };
    expect(el.prop).to.deep.equal({ value: 'value' });
    expect(el).shadowDom.to.equal('attr: , prop: value, state: ');
  });

  it('修改 state', async () => {
    const el = await fixture(html`
      <gem-demo></gem-demo>
    `);
    el.setState({ value: 'state' });
    expect(el.state).to.deep.equal({ value: 'state' });
    expect(el).shadowDom.to.equal('attr: , prop: , state: state');
  });

  it('更新 store', async () => {
    const el = await fixture(html`
      <gem-demo></gem-demo>
    `);
    updateStore(store, { a: ++store.a });
    updateStore(store, { a: ++store.a });
    await aTimeout();
    expect(el.renderCount).to.equal(2);
    el.disconnectStores([store]);
    updateStore(store, { a: ++store.a });
    await aTimeout();
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
    expect(el.renderCount).to.equal(1);
    await aTimeout(20);
    expect(el.renderCount).to.equal(3);
    await aTimeout(20);
    expect(el.renderCount).to.equal(3);
  });
});
