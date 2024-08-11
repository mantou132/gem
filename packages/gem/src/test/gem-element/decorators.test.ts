import { fixture, expect } from '@open-wc/testing';

import { createCSSSheet, GemElement, html, Metadata, createRef } from '../../lib/element';
import { createStore, updateStore } from '../../lib/store';
import { css } from '../../lib/utils';
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
  slot,
  state,
  shadow,
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
@shadow()
class DecoratorGemElement extends GemElement {
  // 测试同名
  @part static sayHi: string;
  @slot static rankAttr: string;

  @emitter sayHi: Emitter;
  @attribute rankAttr: string;
  @boolattribute rankDisabled: boolean;
  @numattribute rankCount: number;
  @property propData = { value: '' };
  @state openState: boolean;
  @part headerPart: string;
  @slot bodySlot: string;
  inputRef = createRef<HTMLElement>();
  renderCount = 0;
  render() {
    this.renderCount++;
    const { rankAttr, rankDisabled, rankCount, propData } = this;
    return html`attr: ${rankAttr}, disabled: ${rankDisabled}, count: ${rankCount}, prop: ${propData.value}`;
  }
}

describe('装饰器', () => {
  it('使用装饰器定义的未插入文档元素', async () => {
    const el = new DecoratorGemElement();
    expect(el.propData).to.eql({ value: '' });
    expect(el.getAttribute('rank-attr')).to.equal(null);
    expect(el.rankAttr).to.equal('');

    el.rankAttr = 'attr';
    el.propData = { value: '1' };
    const el2 = el.cloneNode() as DecoratorGemElement;
    expect(el2.getAttribute('rank-attr')).to.equal('attr');
    expect(el2.rankAttr).to.equal('attr');
    expect(el2.propData).to.eql({ value: '' });
  });
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
    const metadata: Metadata = Reflect.get(DecoratorGemElement, Symbol.metadata);
    expect(metadata.observedStores).to.eql([{ a: 1 }]);
    expect(metadata.observedAttributes).to.eql(['rank-attr', 'rank-disabled', 'rank-count']);
    expect(metadata.definedEvents).to.eql(['say-hi']);
    expect(metadata.definedCSSStates).to.eql(['open-state']);
    expect(metadata.definedParts).to.eql(['say-hi', 'header-part']);
    expect(metadata.definedSlots).to.eql(['rank-attr', 'body-slot']);
    expect(metadata.observedProperties).to.eql(['propData']);
    expect(DecoratorGemElement.sayHi).to.equal('say-hi');
    expect(DecoratorGemElement.rankAttr).to.equal('rank-attr');
    expect(el.rankAttr).to.equal('attr');
    expect(el.rankDisabled).to.equal(true);
    expect(el.rankCount).to.equal(2);
    expect(el.propData).to.eql({ value: 'prop' });
    expect(el.openState).to.equal(false);
    expect(el.headerPart).to.equal('header-part');
    expect(el.inputRef.ref.startsWith('ref-')).to.equal(true);
    expect(el.bodySlot).to.equal('body-slot');
    expect(el).shadowDom.to.equal('attr: attr, disabled: true, count: 2, prop: prop');
    updateStore(store, { a: 3 });
    await Promise.resolve();
    expect(el.renderCount).to.equal(3);
    el.sayHi(2);
    expect(el.renderCount).to.equal(3);
    expect(a).to.equal(2);
  });
});
