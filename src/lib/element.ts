/* eslint-disable @typescript-eslint/no-empty-function */

import { html, render, TemplateResult } from 'lit-html';
import { connect, disconnect, HANDLES_KEY, Store } from './store';
import { Pool, addMicrotask, Sheet, SheetToken, kebabToCamelCase, emptyFunction } from './utils';

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

  __unmountCallback: UnmountCallback | undefined;

  constructor(shadow = true) {
    super();
    this.setState = this.setState.bind(this);
    this.willMount = this.willMount.bind(this);
    this.render = this.render.bind(this);
    this.mounted = this.mounted.bind(this);
    this.shouldUpdate = this.shouldUpdate.bind(this);
    this.__update = this.__update.bind(this);
    this.updated = this.updated.bind(this);
    this.attributeChanged = this.attributeChanged.bind(this);
    this.propertyChanged = this.propertyChanged.bind(this);
    this.unmounted = this.unmounted.bind(this);

    this.__renderRoot = shadow ? this.attachShadow({ mode: 'open' }) : this;
    const { observedAttributes, observedPropertys, defineEvents, observedStores, adoptedStyleSheets } = new.target;
    if (observedAttributes) {
      observedAttributes.forEach(attr => {
        const prop = kebabToCamelCase(attr);
        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        // @ts-ignore
        if (typeof this[prop] === 'function') {
          throw `Don't use attribute with the same name as native methods`;
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
            that.propertyChanged(prop, propValue, v);
            addMicrotask(that.__update);
          }
        }
      },
    });
  }

  /**@final */
  setState(payload: Partial<T>) {
    if (!this.state) throw new Error('`state` not initialized');
    Object.assign(this.state, payload);
    addMicrotask(this.__update);
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
    }
  }

  /**@helper */
  update() {
    this.__update();
  }

  /**@lifecycle */
  updated(): any {}

  // 同步触发
  /**@lifecycle */
  propertyChanged(_name: string, _oldValue: any, _newValue: any): any {}
  // 同步触发
  /**@lifecycle */
  attributeChanged(_name: string, _oldValue: string, _newValue: string): any {}

  /**@lifecycle */
  unmounted(): any {}

  /**@private */
  /**@final */
  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (this.__isMounted) {
      this.attributeChanged(name, oldValue, newValue);
      addMicrotask(this.__update);
    }
  }

  /**@final */
  __connectedCallback() {
    render(this.render(), this.__renderRoot);
    const callback = this.mounted();
    if (typeof callback === 'function') this.__unmountCallback = callback;
    this.__isMounted = true;
  }

  /**@private */
  /**@final */
  // adoptedCallback() {}

  /**@private */
  /**@final */
  disconnectedCallback() {
    const constructor = this.constructor as typeof BaseElement;
    if (constructor.observedStores) {
      constructor.observedStores.forEach(store => {
        disconnect(store, this.__update);
      });
    }
    this.__unmountCallback?.();
    this.unmounted();
    this.__isMounted = false;
  }
}

export abstract class GemElement<T = {}> extends BaseElement<T> {
  /**@private */
  /**@final */
  connectedCallback() {
    this.willMount();
    this.__connectedCallback();
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
      }
    });
  }

  /**@private */
  /**@final */
  connectedCallback() {
    this.willMount();
    renderTaskPool.add(() => {
      this.__connectedCallback();
    });
  }
}
