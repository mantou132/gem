import { fixture, expect, nextFrame } from '@open-wc/testing';

import { GemElement, html } from '../../lib/element';
import { createStore, updateStore } from '../../lib/store';
import { createCSSSheet, css } from '../../lib/utils';
import {
  adoptedStyle,
  attribute,
  boolattribute,
  connectStore,
  customElement,
  numattribute,
  property,
} from '../../lib/decorators';

const store = createStore({
  a: 1,
});

const styles = createCSSSheet(css`
  :host {
    background: rgb(255, 0, 0);
  }
`);

@connectStore(store)
@adoptedStyle(styles)
@customElement('gem-demo')
class GemDemo extends GemElement {
  @attribute longAttr: string;
  @attribute attr: string;
  @boolattribute disabled: boolean;
  @numattribute count: number;
  @property prop = { value: '' };

  state = { value: '' };

  renderCount = 0;

  render() {
    const { attr, disabled, count, prop, state } = this;
    this.renderCount++;
    return html`attr: ${attr}, disabled: ${disabled}, count: ${count}, prop: ${prop.value}, state: ${state.value}`;
  }
}

class DeferGemElement extends GemElement {
  @attribute attr: string;
  @property prop: { value: string };
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
    const el = await fixture(html`<gem-demo attr="attr" .prop=${{ value: 'prop' }}></gem-demo>`);
    expect(window.getComputedStyle(el).backgroundColor).to.equal('rgb(255, 0, 0)');
  });
  it('closestElement 方法', async () => {
    const el: GemDemo = await fixture(html`<gem-demo attr="attr" .prop=${{ value: 'prop' }}></gem-demo>`);
    expect(el.closestElement('body')).to.equal(document.body);
    expect(el.closestElement(HTMLBodyElement)).to.equal(document.body);
  });
  it('渲染 gem element', async () => {
    const el: GemDemo = await fixture(html`<gem-demo attr="attr" .prop=${{ value: 'prop' }}></gem-demo>`);
    expect(el).shadowDom.to.equal('attr: attr, disabled: false, count: 0, prop: prop, state: ');
    await Promise.resolve();
    expect(el.renderCount).to.equal(1);
    el.update();
    await Promise.resolve();
    expect(el.renderCount).to.equal(2);
  });
  it('读取 attr', async () => {
    const el: GemDemo = await fixture(html`
      <gem-demo attr="attr" ?disabled=${true} count=${1} long-attr="hi"></gem-demo>
    `);
    expect(el.attr).to.equal('attr');
    expect(el.longAttr).to.equal('hi');
    expect(el.disabled).to.equal(true);
    expect(el.count).to.equal(1);
  });

  it('修改 attr', async () => {
    const el: GemDemo = await fixture(html`<gem-demo attr="attr"></gem-demo>`);
    expect(el.renderCount).to.equal(1);
    el.attr = 'rrr';
    el.attr = 'value';
    el.disabled = true;
    el.count = 2;
    await Promise.resolve();
    // 相同值不触发更新
    el.attr = 'value';
    el.disabled = true;
    el.count = 2;
    await Promise.resolve();
    expect(el.renderCount).to.equal(2);
    expect(el.attr).to.equal('value');
    expect(el.disabled).to.equal(true);
    expect(el.count).to.equal(2);
    expect(el).shadowDom.to.equal('attr: value, disabled: true, count: 2, prop: , state: ');
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    el.attr = null;
    await Promise.resolve();
    expect(el.hasAttribute('attr')).to.equal(false);
  });

  it('读取 prop', async () => {
    const el: GemDemo = await fixture(html`<gem-demo .prop=${{ value: 'prop' }}></gem-demo>`);
    expect(el.prop).to.deep.equal({ value: 'prop' });
  });

  it('修改 prop', async () => {
    const el: GemDemo = await fixture(html`<gem-demo .prop=${{ value: 'prop' }}></gem-demo>`);
    expect(el.renderCount).to.equal(1);
    el.prop = { value: 'asdfasdfdsf' };
    el.prop = { value: 'value' };
    el.prop = { value: 'value' };
    await Promise.resolve();
    expect(el.renderCount).to.equal(2);
    expect(el.prop).to.deep.equal({ value: 'value' });
    expect(el).shadowDom.to.equal('attr: , disabled: false, count: 0, prop: value, state: ');
  });

  it('修改 state', async () => {
    const el: GemDemo = await fixture(html`<gem-demo></gem-demo>`);
    expect(el.renderCount).to.equal(1);
    el.setState({ value: 'asfasdf' });
    el.setState({ value: 'state' });
    el.setState({ value: 'state' });
    await Promise.resolve();
    expect(el.renderCount).to.equal(2);
    expect(el.state).to.deep.equal({ value: 'state' });
    expect(el).shadowDom.to.equal('attr: , disabled: false, count: 0, prop: , state: state');
  });

  it('更新 store', async () => {
    const a = store.a;
    const el: GemDemo = await fixture(html`<gem-demo></gem-demo>`);
    updateStore(store, { a: ++store.a });
    updateStore(store, { a: ++store.a });
    expect(store.a).to.equal(a + 2);
    expect(el.renderCount).to.equal(1);
    await Promise.resolve();
    expect(el.renderCount).to.equal(2);
  });
});
