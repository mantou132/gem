import { createDecoratorTheme } from '../../helper/theme';
import type { Emitter } from '../../lib/decorators';
import {
  adoptedStyle,
  attribute,
  boolattribute,
  connectStore,
  customElement,
  emitter,
  numattribute,
  part,
  property,
  shadow,
  slot,
  state,
} from '../../lib/decorators';
import type { Metadata } from '../../lib/element';
import { css, GemElement, html } from '../../lib/element';
import { createStore } from '../../lib/store';
import { expect, fixture } from '../utils';

const elemTheme = createDecoratorTheme({ color: 'rgb(255, 0, 0)' });

const themeDemoStyle = css`
  :host {
    color: ${elemTheme.color};
  }
`;

@customElement('decorator-theme-demo')
@adoptedStyle(themeDemoStyle)
@shadow()
class DecoratorThemeDemo extends GemElement {
  @boolattribute active: boolean;

  @elemTheme((i) => [i.active])
  #theme = () => ({
    color: this.active ? 'rgb(0, 0, 255)' : 'rgb(255, 0, 0)',
  });

  render() {
    return html`Theme Demo`;
  }
}

const lightThemeDemoStyle = css`
  :scope {
    color: ${elemTheme.color};
  }
`;

@customElement('decorator-theme-light-demo')
@adoptedStyle(lightThemeDemoStyle)
class DecoratorThemeLightDemo extends GemElement {
  @boolattribute active: boolean;

  @elemTheme((i) => [i.active])
  #theme = () => ({
    color: this.active ? 'rgb(0, 0, 255)' : 'rgb(255, 0, 0)',
  });

  render() {
    return html`<span>Light Theme Demo</span>`;
  }
}

const store = createStore({
  a: 1,
});

const styles = css`
  :host {
    background: rgb(255, 0, 0);
  }
`;

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
    store({ a: 1 });
    await Promise.resolve();
    const metadata: Metadata = Reflect.get(DecoratorGemElement, Symbol.metadata);
    expect({ ...metadata.observedStores?.at(0) }).to.eql({ a: 1 });
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
    expect(el.bodySlot).to.equal('body-slot');
    expect(el.shadowRoot?.textContent).to.equal('attr: attr, disabled: true, count: 2, prop: prop');
    store({ a: 3 });
    await Promise.resolve();
    expect(el.renderCount).to.equal(3);
    el.sayHi(2);
    await Promise.resolve();
    expect(el.renderCount).to.equal(3);
    expect(a).to.equal(2);
  });

  it('createDecoratorTheme 响应式更新及多实例隔离', async () => {
    const el1: DecoratorThemeDemo = await fixture(html`<decorator-theme-demo></decorator-theme-demo>`);
    const el2: DecoratorThemeDemo = await fixture(html`<decorator-theme-demo active></decorator-theme-demo>`);

    expect(getComputedStyle(el1).color).to.equal('rgb(255, 0, 0)');
    expect(getComputedStyle(el2).color).to.equal('rgb(0, 0, 255)');

    el1.active = true;
    await Promise.resolve();
    expect(getComputedStyle(el1).color).to.equal('rgb(0, 0, 255)');
    expect(getComputedStyle(el2).color).to.equal('rgb(0, 0, 255)');

    const elLight: DecoratorThemeLightDemo = await fixture(
      html`<decorator-theme-light-demo></decorator-theme-light-demo>`,
    );
    expect(getComputedStyle(elLight).color).to.equal('rgb(255, 0, 0)');
    elLight.active = true;
    await Promise.resolve();
    expect(getComputedStyle(elLight).color).to.equal('rgb(0, 0, 255)');
  });
});
