import { fixture, expect, nextFrame } from '@open-wc/testing';
import { GemElement, html } from '../lib/element';
import { createStore, updateStore } from '../lib/store';
import { createCSSSheet, css } from '../lib/utils';
import {
  attribute,
  property,
  customElement,
  connectStore,
  adoptedStyle,
  emitter,
  boolattribute,
  numattribute,
  Emitter,
  part,
  RefObject,
  refobject,
  slot,
  state,
} from '../lib/decorators';

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
  /** @attr */ disabled: boolean;
  /** @attr */ count: number;
  /** @attr long-attr*/ longAttr: string;
  static observedAttributes = ['attr', 'long-attr', 'disabled', 'count'];
  static booleanAttributes = new Set(['disabled']);
  static numberAttributes = new Set(['count']);

  static observedStores = [store];

  prop = { value: '' };
  static observedPropertys = ['prop'];

  static adoptedStyleSheets = [styles];
  state = { value: '' };

  renderCount = 0;

  render() {
    const { attr, disabled, count, prop, state } = this;
    this.renderCount++;
    return html`attr: ${attr}, disabled: ${disabled}, count: ${count}, prop: ${prop.value}, state: ${state.value}`;
  }
}

customElements.define('gem-demo', GemDemo);

@connectStore(store)
@adoptedStyle(styles)
@customElement('decorator-gem-demo')
class DecoratorGemElement extends GemElement {
  @emitter hi: Emitter;
  @attribute rankAttr: string;
  @boolattribute rankDisabled: boolean;
  @numattribute rankCount: number;
  @property dataProp = { value: '' };
  @state openState: boolean;
  @part headerPart: string;
  @refobject inputRef: RefObject<HTMLElement>;
  @slot bodySlot: string;
  renderCount = 0;
  render() {
    this.renderCount++;
    const { rankAttr, rankDisabled, rankCount, dataProp } = this;
    return html`attr: ${rankAttr}, disabled: ${rankDisabled}, count: ${rankCount}, prop: ${dataProp.value}`;
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
    const el = await fixture(html`<gem-demo attr="attr" .prop=${{ value: 'prop' }}></gem-demo>`);
    expect(window.getComputedStyle(el).backgroundColor).to.equal('rgb(255, 0, 0)');
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
    class G extends GemElement {
      static observedAttributes = ['attr'];
      attr!: string;
      test = expect(this.attr).to.equal('attr');
    }
    customElements.define('temp-field-read-attr', G);
    await fixture(html`<temp-field-read-attr attr="attr"></temp-field-read-attr>`);
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
    expect(el.renderCount).to.equal(2);
    expect(el.attr).to.equal('value');
    expect(el.disabled).to.equal(true);
    expect(el.count).to.equal(2);
    expect(el).shadowDom.to.equal('attr: value, disabled: true, count: 2, prop: , state: ');
    el.attr = null;
    await Promise.resolve();
    expect(el.hasAttribute('attr')).to.equal(false);
  });

  it('读取 prop', async () => {
    class G extends GemElement {
      static observedPropertys = ['prop'];
      prop!: any;
      test = expect(this.prop).to.equal(undefined);
    }
    customElements.define('temp-field-read-prop', G);
    await fixture(html`<temp-field-read-prop .prop=${{ value: 'prop' }}></temp-field-read-prop>`);
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
  it('装饰器定义的自定义元素', async () => {
    let a = 1;
    const el: DecoratorGemElement = await fixture(html`
      <decorator-gem-demo
        @hi=${(e: CustomEvent) => (a = e.detail)}
        .dataProp=${{ value: 'prop' }}
        rank-attr="attr"
        rank-disabled
        rank-count="2"
      ></decorator-gem-demo>
    `);
    expect(DecoratorGemElement.observedAttributes).to.eql(['rank-attr', 'rank-disabled', 'rank-count']);
    expect(DecoratorGemElement.booleanAttributes).to.eql(new Set(['rank-disabled']));
    expect(DecoratorGemElement.numberAttributes).to.eql(new Set(['rank-count']));
    expect(DecoratorGemElement.observedPropertys).to.eql(['dataProp']);
    expect(DecoratorGemElement.observedStores?.length).to.equal(1);
    expect(DecoratorGemElement.defineEvents?.length).to.equal(1);
    expect(DecoratorGemElement.defineCSSStates).to.eql(['open-state']);
    expect(DecoratorGemElement.defineParts).to.eql(['header-part']);
    expect(DecoratorGemElement.defineRefs).to.eql(['inputRef']);
    expect(DecoratorGemElement.defineSlots).to.eql(['body-slot']);
    expect(el.rankAttr).to.equal('attr');
    expect(el.rankDisabled).to.equal(true);
    expect(el.rankCount).to.equal(2);
    expect(el.dataProp).to.eql({ value: 'prop' });
    expect(el.openState).to.equal(false);
    expect(el.headerPart).to.equal('header-part');
    expect(el.inputRef.ref).to.equal('input-ref');
    expect(el.bodySlot).to.equal('body-slot');
    expect(el).shadowDom.to.equal('attr: attr, disabled: true, count: 2, prop: prop');
    updateStore(store, { a: 3 });
    await Promise.resolve();
    expect(el.renderCount).to.equal(2);
    el.hi(2);
    expect(el.renderCount).to.equal(2);
    expect(a).to.equal(2);
  });

  it('装饰器和静态属性共存', async () => {
    const el: DecoratorGemElement2 = await fixture(html`<decorator-gem-demo2></decorator-gem-demo2>`);
    updateStore(store, { a: 3 });
    await Promise.resolve();
    expect(el.renderCount).to.equal(2);
    expect(el.shadowRoot?.adoptedStyleSheets.length).to.equal(1);
  });
});

class AsyncGemDemo extends GemElement {
  static observedStores = [store];
  constructor() {
    super({ isAsync: true });
  }
  state = { a: 0 };
  renderCount = 0;
  render() {
    this.renderCount++;
    return null;
  }
}
customElements.define('async-gem-demo', AsyncGemDemo);

describe('异步 gem element 测试', () => {
  it('异步 gem element 更新', async () => {
    const el: AsyncGemDemo = await fixture(html`<async-gem-demo></async-gem-demo>`);
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
    super({ isLight: true });
  }
  render() {
    return html`hi`;
  }
}
describe('没有 Shadow DOM 的 gem 元素', () => {
  it('渲染没有 Shadow DOM 的 gem 元素', async () => {
    const el: LightGemDemo = await fixture(html`<light-gem-demo></light-gem-demo>`);
    expect(el.shadowRoot).to.equal(null);
    expect(el.innerHTML.includes('hi')).to.equal(true);
  });
});

@customElement('lifecycle-gem-demo')
class LifecycleGemElement extends GemElement {
  renderCount = 0;
  mounted() {
    this.renderCount++;
    return () => {
      this.renderCount = 0;
    };
  }
}
describe('gem element 生命周期', () => {
  it('mounted/unmounted', async () => {
    const el: LifecycleGemElement = await fixture(html`<lifecycle-gem-demo></lifecycle-gem-demo>`);
    expect(el.renderCount).to.equal(1);
    el.remove();
    expect(el.renderCount).to.equal(0);
  });
});

class EffectGemDemo extends GemElement {
  @attribute attr = 'a';
  @property prop = {};
  effectCount = 0;
  constructor() {
    super();
    this.effect(
      () => this.effectCount++,
      () => [this.attr, this.prop],
    );
  }
  mounted() {
    this.effect(
      () => this.effectCount++,
      () => [],
    );
  }
}
customElements.define('effect-gem-demo', EffectGemDemo);
describe('gem element 副作用', () => {
  it('依赖当前值', async () => {
    const el: EffectGemDemo = await fixture(html`<effect-gem-demo></effect-gem-demo>`);
    expect(el.effectCount).to.equal(2);
    el.attr = 'b';
    el.prop = {};
    expect(el.__effectList?.[0]?.values?.[0]).to.equal('a');
    await nextFrame();
    expect(el.effectCount).to.equal(3);
    expect(el.__effectList?.[0]?.values?.[0]).to.equal('b');
  });
});
