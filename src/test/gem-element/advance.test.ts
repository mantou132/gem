import { fixture, expect, nextFrame } from '@open-wc/testing';
import { GemElement, html } from '../../lib/element';
import { createStore, updateStore } from '../../lib/store';
import { attribute, property, customElement, emitter } from '../../lib/decorators';

const store = createStore({
  a: 1,
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
  @attribute appTitle = 'default';
  @attribute appTitle2 = 'default2';
  constructor(appTitle: string, appTitle2: string) {
    super();
    this.appTitle = appTitle;
    this.appTitle2 = appTitle2;
  }
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
  it('初始化元素', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    container.innerHTML = '<lifecycle-gem-demo app-title="title"></lifecycle-gem-demo>';
    const el = container.firstElementChild as LifecycleGemElement;
    expect(el.appTitle).to.equal('title');
    expect(el.renderCount).to.equal(1);
    expect((el.cloneNode() as LifecycleGemElement).appTitle).to.equal('title');

    const el2 = new LifecycleGemElement('', '2');
    expect(el2.appTitle).to.equal('');
    expect(el2.appTitle2).to.equal('2');
    expect(el2.renderCount).to.equal(0);
    container.append(el2);
    expect(el2.renderCount).to.equal(1);

    const el3 = new LifecycleGemElement('test1', 'test2');
    expect(el3.appTitle).to.equal('test1');
    expect(el3.appTitle2).to.equal('test2');
    expect(el3.renderCount).to.equal(0);
    container.append(el3);
    expect(el3.renderCount).to.equal(1);
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
      () => {
        this.effectCount++;
        return () => (this.effectCount = 0);
      },
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
    await nextFrame();
    expect(el.effectCount).to.equal(3);
    el.remove();
    expect(el.effectCount).to.equal(0);
  });
});

class I extends GemElement {
  @attribute appTitle = 'string';
  @property appData = { a: 1 };
  @emitter sayHi = () => {
    window.name += '1';
  };
}
@customElement('inherit-gem')
class InheritGem extends I {
  @attribute appTitle = '1';
  @attribute appTitle2 = '2';
}
describe('gem element 继承', () => {
  it('静态字段继承', async () => {
    expect(I.observedAttributes).to.eql(['app-title']);
    expect(InheritGem.observedAttributes).to.eql(['app-title', 'app-title', 'app-title2']);
  });
  it('attr/prop/emitter 继承', async () => {
    const el: InheritGem = await fixture(html`<inherit-gem></inherit-gem>`);
    expect(el.appTitle).to.equal('1');
    expect(el.appData.a).to.equal(1);
    el.appTitle = 'b';
    el.appData = { a: 2 };
    expect(el.appTitle).to.equal('b');
    expect(el.appData.a).to.equal(2);
    el.addEventListener('say-hi', () => {
      window.name += '2';
    });
    el.sayHi();
    expect(window.name).to.equal('21');
  });
});
