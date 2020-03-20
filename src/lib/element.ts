/* eslint-disable @typescript-eslint/no-empty-function */

import { html, render, TemplateResult } from 'lit-html';
import { connect, disconnect, HANDLES_KEY, Store } from './store';
import {
  Pool,
  addMicrotask,
  Sheet,
  SheetToken,
  kebabToCamelCase,
  emptyFunction,
  isArrayChange,
  GemError,
} from './utils';

export { html, svg, render, directive, TemplateResult } from 'lit-html';
export { repeat } from 'lit-html/directives/repeat';

// https://github.com/Polymer/lit-html/issues/1048
export { guard } from 'lit-html/directives/guard';

declare global {
  interface ElementInternals {
    states: DOMTokenList;
  }
  interface HTMLElement {
    attachInternals?: () => ElementInternals;
  }
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
  static observedPropertys: string[];
  static observedStores: Store<unknown>[];
  static adoptedStyleSheets: Sheet<unknown>[];
  static defineEvents: string[];

  readonly state: T;
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
    const { observedAttributes, observedPropertys, defineEvents, observedStores, adoptedStyleSheets } = new.target;
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
        if (this[prop] !== undefined) return;
        // !!! Custom property shortcut access only supports `string` type
        Object.defineProperty(this, prop, {
          configurable: true,
          get() {
            // Return empty string if attribute does not exist
            return this.getAttribute(attr) || '';
          },
          set(v: string) {
            if (v === null || v === undefined) {
              this.removeAttribute(attr);
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
    if (observedStores) {
      observedStores.forEach(store => {
        if (!store[HANDLES_KEY]) {
          throw new Error('`observedStores` only support store module');
        }

        connect(store, this.__update);
      });
    }
    if (adoptedStyleSheets) {
      const sheets = adoptedStyleSheets.map(item => item[SheetToken]);
      if (this.shadowRoot) {
        this.shadowRoot.adoptedStyleSheets = sheets;
      } else {
        document.adoptedStyleSheets = document.adoptedStyleSheets.concat(sheets);
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
                  v(evt);
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

  /**@final */
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
   * @final
   * 记录副作用回调和值
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

  /**@lifecycle */
  render(): TemplateResult | null {
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
      render(this.render(), this.__renderRoot);
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
    render(this.render(), this.__renderRoot);
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
    const constructor = this.constructor as typeof BaseElement;
    if (constructor.observedStores) {
      constructor.observedStores.forEach(store => {
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
        render(this.render(), this.__renderRoot);
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
