import { fixture, expect, nextFrame } from '../utils';
import { createCSSSheet, createState, GemElement, html } from '../../lib/element';
import { createStore } from '../../lib/store';
import {
  adoptedStyle,
  attribute,
  boolattribute,
  connectStore,
  customElement,
  fallback,
  numattribute,
  property,
  shadow,
} from '../../lib/decorators';

const store = createStore({
  a: 1,
});

const styles = createCSSSheet`
  :host {
    background: rgb(255, 0, 0);
  }
`;

@connectStore(store)
@adoptedStyle(styles)
@customElement('gem-demo')
@shadow()
class GemDemo extends GemElement {
  @attribute longAttr: string;
  @attribute attr: string;
  @boolattribute disabled: boolean;
  @numattribute count: number;
  @property prop = { value: '' };

  #state = createState({ value: '' });

  renderCount = 0;

  render() {
    if (this.attr === 'error') throw new Error();
    const { attr, disabled, count, prop } = this;
    const { value } = this.#state;
    this.renderCount++;
    return html`attr: ${attr}, disabled: ${disabled}, count: ${count}, prop: ${prop.value}, state: ${value}`;
  }

  @fallback()
  #error = () => html`Error`;
}

describe('基本 gem element 测试', () => {
  it('后定义元素', async () => {
    const el: DeferGemElement = await fixture(html`
      <defer-gem-demo attr="attr" .prop=${{ value: 'prop' }}></defer-gem-demo>
    `);
    expect(el.prop.value).to.equal('prop');
    @customElement('defer-gem-demo')
    class DeferGemElement extends GemElement {
      @attribute attr: string;
      @property prop: { value: string };
    }
    await nextFrame();
    expect(el.prop.value).to.equal('prop');
    expect(el.attr).to.equal('attr');
  });
  it('adoptedStyleSheets 共享样式', async () => {
    const el = await fixture(html`<gem-demo attr="attr" .prop=${{ value: 'prop' }}></gem-demo>`);
    expect(window.getComputedStyle(el).backgroundColor).to.equal('rgb(255, 0, 0)');
  });
  it('渲染 gem element', async () => {
    const el: GemDemo = await fixture(html`<gem-demo attr="attr" .prop=${{ value: 'prop' }}></gem-demo>`);
    expect(el.shadowRoot?.textContent).to.equal('attr: attr, disabled: false, count: 0, prop: prop, state: ');
    await Promise.resolve();
    expect(el.renderCount).to.equal(1);
    el.update();
    await Promise.resolve();
    expect(el.renderCount).to.equal(2);
    const errEl: GemDemo = await fixture(html`<gem-demo attr="error"></gem-demo>`);
    expect(errEl.shadowRoot?.textContent).to.equal('Error');
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
    expect(el.shadowRoot?.textContent).to.equal('attr: value, disabled: true, count: 2, prop: , state: ');
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
    expect(el.shadowRoot?.textContent).to.equal('attr: , disabled: false, count: 0, prop: value, state: ');
  });

  it('只能在 initEffect 前修改 state', async () => {
    const syncUpdateEle = new GemDemo();
    expect(() => syncUpdateEle.internals.stateList[0]()).to.not.throw();
    document.body.append(syncUpdateEle);
    expect(() => syncUpdateEle.internals.stateList[0]()).to.throw();
  });

  it('修改 state', async () => {
    const el: GemDemo = await fixture(html`<gem-demo></gem-demo>`);
    expect(el.renderCount).to.equal(1);
    el.internals.stateList[0]({ value: 'asfasdf' });
    el.internals.stateList[0]({ value: 'state' });
    el.internals.stateList[0]({ value: 'state' });
    await Promise.resolve();
    expect(el.renderCount).to.equal(2);
    expect({ ...el.internals.stateList[0] }).to.deep.equal({ value: 'state' });
    expect(el.shadowRoot?.textContent).to.equal('attr: , disabled: false, count: 0, prop: , state: state');
  });

  it('更新 store', async () => {
    const a = store.a;
    const el: GemDemo = await fixture(html`<gem-demo></gem-demo>`);
    store({ a: ++store.a });
    store({ a: ++store.a });
    expect(store.a).to.equal(a + 2);
    expect(el.renderCount).to.equal(1);
    await Promise.resolve();
    expect(el.renderCount).to.equal(2);
  });
});
