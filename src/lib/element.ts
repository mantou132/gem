/* eslint-disable @typescript-eslint/no-empty-function */

import { html, render, TemplateResult } from 'lit-html';
import { connect, disconnect, Store } from './store';
import { Pool, addMicrotask, Sheet, SheetToken, kebabToCamelCase, isArrayChange, GemError } from './utils';

export { html, svg, render, directive, TemplateResult } from 'lit-html';
export { repeat } from 'lit-html/directives/repeat';

// https://github.com/Polymer/lit-html/issues/1048
export { guard } from 'lit-html/directives/guard';

export { ifDefined } from 'lit-html/directives/if-defined';

declare global {
  interface ElementInternals {
    states: DOMTokenList;
  }
  interface HTMLElement {
    attachInternals?: () => ElementInternals;
  }
}

function emptyFunction() {
  // 用于占位的空函数
}

type UnmountCallback = () => void;
type GetDepFun = () => any[];
type EffectItem = { callback: Function; values: any[]; getDep: GetDepFun; initialized: boolean };

// final 字段如果使用 symbol 或者 private 将导致 modal-base 生成匿名子类 declaration 失败
/**
 * @attr ref
 */
export abstract class BaseElement<T = {}> extends HTMLElement {
  // 这里只是字段申明，不能赋值，否则子类会继承被共享该字段
  static observedAttributes: string[]; // WebAPI 中是实时检查这个列表
  static booleanAttributes: Set<string>;
  static numberAttributes: Set<string>;
  static observedPropertys: string[];
  static observedStores: Store<unknown>[];
  static adoptedStyleSheets: Sheet<unknown>[];
  static defineEvents: string[];

  // 定义当前元素的状态，和 attr/prop 的本质区别是不为外部输入
  readonly state: T;
  // 用于 css 选择器选择元素，使用 @ref 自动选择获取，应该避免重名
  readonly ref: string;

  /**@final */
  __renderRoot: HTMLElement | ShadowRoot;
  /**@final */
  __internals: ElementInternals | undefined;
  /**@final */
  __isMounted: boolean;
  /**@final */
  __effectList: EffectItem[] | undefined;

  __unmountCallback: UnmountCallback | undefined;

  constructor(shadow = true) {
    super();
    this.effect = this.effect.bind(this);
    this.setState = this.setState.bind(this);
    this.willMount = this.willMount.bind(this);
    this.render = this.render.bind(this);
    this.mounted = this.mounted.bind(this);
    this.shouldUpdate = this.shouldUpdate.bind(this);
    this.__update = this.__update.bind(this);
    this.__execEffect = this.__execEffect.bind(this);
    this.updated = this.updated.bind(this);
    this.unmounted = this.unmounted.bind(this);

    this.__renderRoot = shadow ? this.attachShadow({ mode: 'open' }) : this;
    const {
      observedAttributes,
      observedPropertys,
      defineEvents,
      adoptedStyleSheets,
      booleanAttributes,
      numberAttributes,
    } = new.target;
    if (observedAttributes) {
      observedAttributes.forEach(attr => {
        const prop = kebabToCamelCase(attr);
        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        // @ts-ignore
        if (typeof this[prop] === 'function') {
          throw new GemError(`Don't use attribute with the same name as native methods`);
        }
        // Native attribute，no need difine property
        // e.g: `id`, `title`, `hidden`, `alt`, `lang`
        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        // @ts-ignore
        if (this[prop] !== undefined) {
          // 所以 `prop` 不能是方法
          return;
        }
        // !!! Custom property shortcut access only supports `string` type
        Object.defineProperty(this, prop, {
          configurable: true,
          get() {
            const that = this as BaseElement;
            const value = that.getAttribute(attr);
            if (booleanAttributes?.has(prop)) {
              return value === null ? false : true;
            }
            if (numberAttributes?.has(prop)) {
              return Number(value);
            }
            // Return empty string if attribute does not exist
            return this.getAttribute(attr) || '';
          },
          set(v: string | null | undefined | number | boolean) {
            const isBool = booleanAttributes?.has(prop);
            if (v === null || v === undefined || (isBool && !v)) {
              this.removeAttribute(attr);
            } else if (isBool && v) {
              this.setAttribute(attr, '');
            } else {
              this.setAttribute(attr, v);
            }
          },
        });
      });
    }
    if (observedPropertys) {
      observedPropertys.forEach(prop => {
        this.__connectProperty(prop, false);
      });
    }
    if (defineEvents) {
      defineEvents.forEach(event => {
        this.__connectProperty(event, true);
        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        // @ts-ignore
        this[event] = emptyFunction;
      });
    }
    if (adoptedStyleSheets) {
      const sheets = adoptedStyleSheets.map(item => item[SheetToken]);
      if (this.shadowRoot) {
        this.shadowRoot.adoptedStyleSheets = sheets;
      } else {
        document.adoptedStyleSheets = [...new Set(document.adoptedStyleSheets.concat(sheets))];
      }
    }
  }

  /**@final */
  get internals() {
    if (!this.__internals) {
      if (!this.attachInternals) {
        // https://bugs.webkit.org/show_bug.cgi?id=197960
        this.attachInternals = () => ({ states: this.classList });
      }
      this.__internals = this.attachInternals();
      if (!this.__internals.states) {
        // https://bugzilla.mozilla.org/show_bug.cgi?id=1588763
        this.__internals.states = this.classList;
      }
    }
    return this.__internals;
  }

  /**
   * @final
   * 和 `attr` 不一样，只有等 `lit-html` 在已经初始化的元素上设置 `prop` 后才能访问
   * 所以能在类字段中直接访问 `attr` 而不能访问 `prop`
   * @example
   * class TempGem extends GemElement {
   *   static observedPropertys = ['prop'];
   *   test = expect(this.prop).to.equal(undefined);
   * }
   * // <temp-gem .prop=${{a: 1}}></temp-gem>
   * */
  __connectProperty(prop: string, isEventHandle = false) {
    if (prop in this) return;
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    let propValue: any = this[prop];
    Object.defineProperty(this, prop, {
      configurable: true,
      get() {
        return propValue;
      },
      set(v) {
        const that = this as GemElement;
        if (v !== propValue) {
          if (isEventHandle) {
            propValue = v?.__isEventHandle
              ? v
              : (detail: any, options: any) => {
                  const evt = new CustomEvent(prop.toLowerCase(), { detail, ...options });
                  that.dispatchEvent(evt);
                  v(detail, options);
                };
            propValue.__isEventHandle = true;
          } else {
            propValue = v;
          }
          if (that.__isMounted) {
            addMicrotask(that.__update);
          }
        }
      },
    });
  }

  /**
   * @helper
   * 设置元素 state，会触发更新
   *
   * @example
   * ```js
   * class App extends GemElement {
   *   click() {
   *     this.setState({});
   *   }
   * }
   * ```
   * */
  setState(payload: Partial<T>) {
    if (!this.state) throw new GemError('`state` not initialized');
    Object.assign(this.state, payload);
    addMicrotask(this.__update);
  }

  /**
   * @final
   * 每次更新完检查依赖，执行对应的副作用回调
   * */
  __execEffect() {
    this.__effectList?.forEach(effectItem => {
      const { callback, getDep, values } = effectItem;
      const newValues = getDep();
      if (isArrayChange(values, newValues)) callback();
      effectItem.values = newValues;
    });
  }

  /**
   * @helper
   * 记录副作用回调和值
   *
   * @example
   * ```js
   * class App extends GemElement {
   *   mounted() {
   *     this.effect(callback, () => [this.attrName]);
   *   }
   * }
   * ```
   * */
  effect(callback: Function, getDep: GetDepFun) {
    if (!this.__effectList) this.__effectList = [];
    const values = getDep();
    // 以挂载时立即执行副作用，未挂载时等挂载后执行
    if (this.__isMounted) callback();
    this.__effectList.push({ callback, getDep, values, initialized: this.__isMounted });
  }

  /**
   * @final
   * 元素挂载后执行还未初始化的副作用
   * */
  __initEffect() {
    this.__effectList?.forEach(effectItem => {
      const { callback, initialized } = effectItem;
      if (!initialized) {
        callback();
        effectItem.initialized = true;
      }
    });
  }

  /**@lifecycle */
  willMount(): any {}

  /**
   * @lifecycle
   * 返回 null 时渲染 lit-html 定义的空内容
   * 返回 undefined 时不会调用 `render()`
   * */
  render(): TemplateResult | null | undefined {
    return html`
      <slot></slot>
    `;
  }

  /**@lifecycle */
  mounted(): any {}

  /**@lifecycle */
  shouldUpdate() {
    return true;
  }

  /**@final */
  __update() {
    if (this.__isMounted && this.shouldUpdate()) {
      const temp = this.render();
      temp !== undefined && render(temp, this.__renderRoot);
      addMicrotask(this.updated);
      addMicrotask(this.__execEffect);
    }
  }

  /**@helper */
  update() {
    this.__update();
  }

  /**@lifecycle */
  updated(): any {}

  /**@lifecycle */
  unmounted(): any {}

  /**@private */
  /**@final */
  attributeChangedCallback() {
    if (this.__isMounted) {
      addMicrotask(this.__update);
    }
  }

  /**@final */
  __connectedCallback() {
    const { observedStores } = this.constructor as typeof BaseElement;
    if (observedStores) {
      observedStores.forEach(store => {
        connect(store, this.__update);
      });
    }
    const temp = this.render();
    temp !== undefined && render(temp, this.__renderRoot);
    this.__isMounted = true;
    const callback = this.mounted();
    if (typeof callback === 'function') this.__unmountCallback = callback;
  }

  /**@private */
  /**@final */
  // adoptedCallback() {}

  /**@private */
  /**@final */
  disconnectedCallback() {
    this.__isMounted = false;
    const { observedStores } = this.constructor as typeof BaseElement;
    if (observedStores) {
      observedStores.forEach(store => {
        disconnect(store, this.__update);
      });
    }
    this.__unmountCallback?.();
    this.unmounted();
  }
}

export abstract class GemElement<T = {}> extends BaseElement<T> {
  /**@private */
  /**@final */
  connectedCallback() {
    this.willMount();
    this.__connectedCallback();
    this.__initEffect();
  }
}

// global render task pool
const renderTaskPool = new Pool<Function>();
let loop = false;
const tick = () => {
  window.requestAnimationFrame(function callback(timestamp) {
    const task = renderTaskPool.get();
    if (task) {
      task();
      if (performance.now() - timestamp < 16) {
        callback(timestamp);
        return;
      }
    }
    // `renderTaskPool` not empty
    if (loop) {
      tick();
    }
  });
};
renderTaskPool.addEventListener('start', () => {
  loop = true;
  tick();
});
renderTaskPool.addEventListener('end', () => (loop = false));

export abstract class AsyncGemElement<T = {}> extends BaseElement<T> {
  /**@final */
  __update() {
    renderTaskPool.add(() => {
      if (this.shouldUpdate()) {
        const temp = this.render();
        temp !== undefined && render(temp, this.__renderRoot);
        this.updated();
        addMicrotask(this.__execEffect);
      }
    });
  }

  /**@private */
  /**@final */
  connectedCallback() {
    this.willMount();
    renderTaskPool.add(() => {
      this.__connectedCallback();
      this.__initEffect();
    });
  }
}
