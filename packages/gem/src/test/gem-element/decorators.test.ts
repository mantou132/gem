import { fixture, expect } from '@open-wc/testing';

import { GemElement, html } from '../../lib/element';
import { createStore, updateStore } from '../../lib/store';
import { createCSSSheet, css } from '../../lib/utils';
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
@customElement('decorator-gem-demo')
class DecoratorGemElement extends GemElement {
  @emitter sayHi: Emitter;
  @attribute rankAttr: string;
  @boolattribute rankDisabled: boolean;
  @numattribute rankCount: number;
  @property propData = { value: '' };
  @state openState: boolean;
  @part headerPart: string;
  @refobject inputRef: RefObject<HTMLElement>;
  @slot bodySlot: string;
  renderCount = 0;
  render() {
    this.renderCount++;
    const { rankAttr, rankDisabled, rankCount, propData } = this;
    return html`attr: ${rankAttr}, disabled: ${rankDisabled}, count: ${rankCount}, prop: ${propData.value}`;
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

describe('装饰器', () => {
  it('装饰器定义的自定义元素', async () => {
    let a = 1;
    const el: DecoratorGemElement = await fixture(html`
      <decorator-gem-demo
        @say-hi=${(e: CustomEvent) => (a = e.detail)}
        .propData=${{ value: 'prop' }}
        rank-attr="attr"
        rank-disabled
        rank-count="2"
      ></decorator-gem-demo>
    `);
    updateStore(store, { a: 1 });
    await Promise.resolve();
    expect(DecoratorGemElement.observedStores).to.eql([{ a: 1 }]);
    expect(DecoratorGemElement.observedAttributes).to.eql(['rank-attr', 'rank-disabled', 'rank-count']);
    expect(DecoratorGemElement.booleanAttributes).to.eql(new Set(['rank-disabled']));
    expect(DecoratorGemElement.numberAttributes).to.eql(new Set(['rank-count']));
    expect(DecoratorGemElement.defineEvents).to.eql(['say-hi']);
    expect(DecoratorGemElement.defineCSSStates).to.eql(['open-state']);
    expect(DecoratorGemElement.defineParts).to.eql(['header-part']);
    expect(DecoratorGemElement.defineSlots).to.eql(['body-slot']);
    expect(DecoratorGemElement.defineRefs?.[0].startsWith('input-ref-')).to.equal(true);
    expect(DecoratorGemElement.observedProperties).to.eql(['propData']);
    expect(el.rankAttr).to.equal('attr');
    expect(el.rankDisabled).to.equal(true);
    expect(el.rankCount).to.equal(2);
    expect(el.propData).to.eql({ value: 'prop' });
    expect(el.openState).to.equal(false);
    expect(el.headerPart).to.equal('header-part');
    expect(el.inputRef.ref.startsWith('input-ref-')).to.equal(true);
    expect(el.bodySlot).to.equal('body-slot');
    expect(el).shadowDom.to.equal('attr: attr, disabled: true, count: 2, prop: prop');
    updateStore(store, { a: 3 });
    await Promise.resolve();
    expect(el.renderCount).to.equal(3);
    el.sayHi(2);
    expect(el.renderCount).to.equal(3);
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
