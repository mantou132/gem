/**
 * 测试 HTMLElement 没有的特性或者不常用的特性
 * - 异步渲染
 * - Light DOM 自定义元素
 * - 生命周期以及 Effect/Memo
 * - 派生元素（类扩展）
 * - 无渲染内容 Gem 元素
 */

import {
  adoptedStyle,
  async,
  attribute,
  connectStore,
  customElement,
  effect,
  emitter,
  mounted,
  property,
  shadow,
} from '../../lib/decorators';
import type { Metadata } from '../../lib/element';
import { createRef, createState, css, GemElement, html } from '../../lib/element';
import { createStore } from '../../lib/store';
import { expect, fixture, nextFrame } from '../utils';

const store = createStore({
  a: 1,
});

@connectStore(store)
@async()
@shadow()
@customElement('async-gem-demo')
class AsyncGemDemo extends GemElement {
  #state = createState({ a: 0 });
  renderCount = 0;
  render() {
    this.renderCount++;
    return null;
  }
}

describe('异步 gem element 测试', () => {
  it('异步 gem element 更新', async () => {
    const el: AsyncGemDemo = await fixture(html`<async-gem-demo></async-gem-demo>`);
    expect(el.renderCount).to.equal(1);
    store({ a: ++store.a });
    el.internals.stateList[0]({ a: ++(el.internals.stateList[0] as any).a });
    await nextFrame();
    expect(el.renderCount).to.equal(2);
    await nextFrame();
    expect(el.renderCount).to.equal(2);
  });
});

const lightStyle = css`
  div {
    font-size: 18.1px;
  }
`;

@customElement('light-gem-demo')
@adoptedStyle(lightStyle)
class LightGemDemo extends GemElement {
  render() {
    return html`<div>hi</div>`;
  }
}
describe('没有 Shadow DOM 的 gem 元素', () => {
  it('渲染没有 Shadow DOM 的 gem 元素', async () => {
    const el0: LightGemDemo = await fixture(html`<div></div>`);
    const el1: LightGemDemo = await fixture(html`<light-gem-demo></light-gem-demo>`);
    const el2: LightGemDemo = await fixture(html`<light-gem-demo></light-gem-demo>`);
    expect(el1.shadowRoot).to.equal(null);
    expect(el1.innerHTML.includes('hi')).to.equal(true);
    expect(getComputedStyle(el0).fontSize).not.to.equal('18.1px');
    expect(getComputedStyle(el2.firstElementChild!).fontSize).to.equal('18.1px');
    el1.remove();
    await Promise.resolve();
    expect(getComputedStyle(el2.firstElementChild!).fontSize).to.equal('18.1px');
    el2.remove();
    // 样式在队列末尾执行
    await Promise.resolve();
    expect(getComputedStyle(el0).fontSize).not.to.equal('18.1px');
  });
});

const scopeStyle = css`
  p {
    text-decoration: underline;
  }
`;

@customElement('scope-child-demo')
class _ScopeChildDemo extends GemElement {
  render() {
    return html`<p>child</p>`;
  }
}

@customElement('scope-gem-demo')
@adoptedStyle(scopeStyle)
class ScopeGemDemo extends GemElement {
  render() {
    return html`<p>own</p><article><p>nested</p></article><scope-child-demo></scope-child-demo>`;
  }
}

@customElement('closed-gem-demo')
@adoptedStyle(css`
  div {
    color: rgb(255, 0, 0);
  }
`)
@shadow({ mode: 'closed' })
class ClosedGemDemo extends GemElement {
  render() {
    return html`<div>closed</div>`;
  }
}

describe('元素样式的作用域', () => {
  it('Light DOM 的样式不影响有模版的子元素', async () => {
    const el: ScopeGemDemo = await fixture(html`<scope-gem-demo></scope-gem-demo>`);
    const decoration = (selector: string) => getComputedStyle(el.querySelector(selector)!).textDecorationLine;
    expect(decoration(':scope > p')).to.equal('underline');
    expect(decoration('article > p')).to.equal('underline');
    expect(decoration('scope-child-demo > p')).to.equal('none');
  });
  it('closed Shadow DOM', async () => {
    const el: ClosedGemDemo = await fixture(html`<closed-gem-demo></closed-gem-demo>`);
    expect(el.shadowRoot).to.equal(null);
    const div = el.internals.shadowRoot!.querySelector('div')!;
    expect(getComputedStyle(div).color).to.equal('rgb(255, 0, 0)');
  });
});

@customElement('effect-ref-demo')
class EffectRefDemo extends GemElement {
  #state = createState({ hidden: false });
  ref = createRef<HTMLTextAreaElement>();
  values: (HTMLTextAreaElement | undefined)[] = [];

  @effect((i) => [i.ref.value])
  #observe = ([ele]: [HTMLTextAreaElement | undefined]) => {
    this.values.push(ele);
  };

  toggle = () => this.#state({ hidden: !this.#state.hidden });

  render() {
    return this.#state.hidden ? null : html`<textarea ${this.ref}></textarea>`;
  }
}

describe('effect 依赖 ref', () => {
  it('元素重新创建时执行', async () => {
    const el: EffectRefDemo = await fixture(html`<effect-ref-demo></effect-ref-demo>`);
    const [first] = el.values;
    expect(first).to.be.instanceOf(HTMLTextAreaElement);
    // 元素移除时 ref 不会清空，保留最后的元素
    el.toggle();
    await nextFrame();
    expect(el.ref.value).to.equal(first);
    expect(el.values).to.eql([first]);
    el.toggle();
    await nextFrame();
    expect(el.values.length).to.equal(2);
    expect(el.values[1]).to.be.instanceOf(HTMLTextAreaElement);
    expect(el.values[1]).not.to.equal(first);
  });
});

class LifecycleGemElement extends GemElement {
  @attribute appTitle = 'default';
  @attribute appTitle2 = 'default2';
  refInConstructor?: HTMLElement;

  divRef = createRef<HTMLDivElement>();

  constructor(appTitle: string, appTitle2: string) {
    super();
    // 字段优先执行于构造函数
    this.appTitle = appTitle ?? this.appTitle;
    this.appTitle2 = appTitle2 ?? this.appTitle2;
    this.effect(
      () => {
        this.refInConstructor = this.divRef.value;
      },
      () => [],
    );
  }
  renderCount = 0;
  mountedCount = 0;
  unmountedCount = 0;

  @mounted()
  #init = () => {
    this.mountedCount++;
    return () => {
      this.renderCount = 0;
      this.unmountedCount++;
    };
  };

  render() {
    this.renderCount++;
    return html`<div ${this.divRef}></div>`;
  }
}
describe('gem element 生命周期', () => {
  it('mounted/unmounted', async () => {
    const el: LifecycleGemElement = await fixture(html`<lifecycle-gem-demo></lifecycle-gem-demo>`);
    // test #isMounted
    customElements.define('lifecycle-gem-demo', LifecycleGemElement);
    await Promise.resolve();
    expect(!!el.refInConstructor).to.equal(true);
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
    const clone = el.cloneNode() as LifecycleGemElement;
    expect(clone.appTitle).to.equal('title');

    const el2 = new LifecycleGemElement('', '2');
    expect(el2.appTitle).to.equal('');
    expect(el2.appTitle2).to.equal('2');
    expect(el2.renderCount).to.equal(0);
    container.append(el2);
    expect(el2.renderCount).to.equal(1);

    // disconnectedCallback, connectedCallback
    container.append(el2);
    await Promise.resolve();
    expect(el2.mountedCount).to.equal(1);
    expect(el2.renderCount).to.equal(1);
    el2.remove();
    expect(el2.mountedCount).to.equal(1);
    expect(el2.unmountedCount).to.equal(1);
    expect(el2.renderCount).to.equal(0);
    container.append(el2);
    await Promise.resolve();
    expect(el2.mountedCount).to.equal(2);
    expect(el2.unmountedCount).to.equal(1, '重新挂载时不再执行已经执行过的清理函数');
    expect(el2.renderCount).to.equal(1);
    el2.update();
    el2.update();
    await Promise.resolve();
    expect(el2.renderCount).to.equal(2);

    const el3 = new LifecycleGemElement('test1', 'test2');
    expect(el3.appTitle).to.equal('test1');
    expect(el3.appTitle2).to.equal('test2');
    expect(el3.renderCount).to.equal(0);
    // 挂载前更新不会造成挂载后多余的渲染
    el3.update();
    el3.appTitle = 'test3';
    container.append(el3);
    expect(el3.renderCount).to.equal(1);
    await Promise.resolve();
    expect(el3.renderCount).to.equal(1);
  });
});

@customElement('effect-gem-demo')
class EffectGemDemo extends GemElement {
  @attribute attr = 'a';
  @property prop = {};
  effectCallCount = 0;
  hasConstructorEffect = false;
  compareCount = 0;
  constructor() {
    super();
    this.effect(
      () => {
        this.hasConstructorEffect = true;
        this.effectCallCount++;
        return () => (this.hasConstructorEffect = false);
      },
      () => {
        this.compareCount++;
        return [this.attr, this.prop];
      },
    );
  }
  @mounted()
  #mounted = () => {
    this.effect(
      (_arr) => {
        this.effectCallCount++;
        return () => (this.effectCallCount = 0);
      },
      () => [],
    );
    this.effect(() => {
      this.effectCallCount++;
    });
  };
}
describe('gem element 副作用', () => {
  it('依赖当前值', async () => {
    const el: EffectGemDemo = await fixture(html`<effect-gem-demo></effect-gem-demo>`);
    expect(el.compareCount).to.equal(1);
    expect(el.effectCallCount).to.equal(3);
    el.attr = 'b';
    el.prop = {};
    await nextFrame();
    expect(el.effectCallCount).to.equal(5);

    let oldV: string | undefined = '';
    let newV: string | undefined = '';
    el.effect(
      ([n], [o]: string[] = []) => {
        oldV = o;
        newV = n;
      },
      () => [el.attr],
    );
    expect(oldV).to.equal(undefined);
    expect(newV).to.equal('b');
    el.attr = 'n';
    await nextFrame();
    expect(oldV).to.equal('b');
    expect(newV).to.equal('n');

    el.remove();
    expect(el.effectCallCount).to.equal(0);
    expect(el.hasConstructorEffect).to.equal(false);
    document.body.append(el);
    await Promise.resolve();
    expect(el.hasConstructorEffect).to.equal(true);
  });
});

@customElement('memo-gem-demo')
class MemoGemDemo extends GemElement {
  @attribute attr = 'a';
  @property prop = {};
  memoNum = 0;
  constructor() {
    super();
    this.memo(
      () => (this.memoNum += 1),
      () => [this.attr, this.prop],
    );
    this.memo(
      (_arr) => {
        this.memoNum += 2;
      },
      () => [],
    );
    this.memo(() => {
      this.memoNum += 4;
    });
  }
}
describe('gem element Memo', () => {
  it('依赖当前值', async () => {
    const el: MemoGemDemo = await fixture(html`<memo-gem-demo></memo-gem-demo>`);
    expect(el.memoNum).to.equal(7);
    el.attr = 'b';
    el.prop = {};
    await nextFrame();
    expect(el.memoNum).to.equal(12);

    el.update();
    await Promise.resolve();
    expect(el.memoNum).to.equal(16);

    document.body.append(el);
    expect(el.memoNum).to.equal(16);

    el.remove();
    await Promise.resolve();
    document.body.append(el);
    expect(el.memoNum).to.equal(23);
  });
});

@customElement('i-gem')
@shadow()
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

@customElement('inherit-gem1')
class InheritGem1 extends I {}

describe('gem element 继承', () => {
  it('静态字段继承', async () => {
    new I();
    new InheritGem(); // 触发装饰器自定义初始化函数
    const metadata: Metadata = Reflect.get(InheritGem, Symbol.metadata);
    expect(metadata.observedAttributes).to.eql(['app-title', 'app-title2']);

    new InheritGem1(); // 触发装饰器自定义初始化函数
    const metadata1: Metadata = Reflect.get(InheritGem1, Symbol.metadata);
    expect(metadata1.observedAttributes).to.eql(['app-title']);
  });
  it('attr/prop/emitter 继承', async () => {
    const name = window.name;
    const el: InheritGem = await fixture(html`<inherit-gem></inherit-gem>`);
    /**
     * NOTE: 默认值不能覆盖，可以在 `constructor` 中重新定义默认值
     *
     * 原因：
     *
     * 1. 执行装饰器时必须保留之前设置的 prop 值，所以 prop 的字段默认值不能覆盖，统一 attr 和 prop 的行为
     * 2. 很难区分是基类中设置的 attr 还是模版中指定的 attr
     */
    expect(el.appTitle).to.equal('string');
    expect(el.appTitle2).to.equal('2');
    expect(el.appData.a).to.equal(1);
    el.appTitle = 'b';
    el.appData = { a: 2 };
    expect(el.appTitle).to.equal('b');
    expect(el.appData.a).to.equal(2);
    el.addEventListener('say-hi', () => {
      window.name += '2';
    });
    el.sayHi();
    await Promise.resolve();
    expect(window.name).to.equal(`${name}21`);
  });
  it('setAttribute 设置基类观察的 attribute', async () => {
    const el: InheritGem1 = await fixture(html`<inherit-gem1></inherit-gem1>`);
    el.setAttribute('app-title', 'c');
    expect(el.appTitle).to.equal('c');
    const el1: InheritGem = await fixture(html`<inherit-gem></inherit-gem>`);
    el1.setAttribute('app-title2', 'd');
    el1.setAttribute('app-title', 'e');
    expect(el1.appTitle2).to.equal('d');
    expect(el1.appTitle).to.equal('e');
  });
});
@customElement('render-empty')
@shadow()
class RenderEmpty extends GemElement {
  render() {
    return undefined;
  }
}
describe('gem element render undefined', () => {
  it('Render undefined', async () => {
    const e: RenderEmpty = await fixture(html`<inherit-gem></inherit-gem>`);
    const innerHTML = '<div></div>';
    e.shadowRoot!.innerHTML = innerHTML;
    e.update();
    expect(e.shadowRoot!.innerHTML).to.equal(innerHTML);
  });
});
