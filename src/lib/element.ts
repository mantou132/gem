/* eslint-disable @typescript-eslint/no-empty-function */

import * as lit from 'lit-html';
import { TemplateResult } from 'lit-html';
import { connect, disconnect, HANDLES_KEY, Store } from './store';
import { Pool, addMicrotask, Sheet, camelToKebabCase, kebabToCamelCase, deleteSubArr } from './utils';

import { repeat as litRepeat } from 'lit-html/directives/repeat';
import { guard as litGuard } from 'lit-html/directives/guard';
import { ifDefined as litIfDefined } from 'lit-html/directives/if-defined';

let litHtml = {
  html: lit.html,
  svg: lit.svg,
  render: lit.render,
  directive: lit.directive,
  repeat: litRepeat,
  guard: litGuard,
  ifDefined: litIfDefined,
};

declare global {
  interface Window {
    __litHtml: typeof litHtml;
  }
}

if (window.__litHtml) {
  // 自定义元素不能重复定义
  // 所以嵌套 gem app 中导出的自定义元素类可能是之前定义的类
  // 可能造成使用的 html 对象不是同一个
  // map, 缓存之类的会变得不同
  // 所以需要把他们放在全局对象中
  litHtml = window.__litHtml;
} else {
  window.__litHtml = litHtml;
}

const { html, svg, render, directive, repeat, guard, ifDefined } = litHtml;
export { html, svg, render, directive, repeat, guard, ifDefined, TemplateResult };

// final 字段如果使用 symbol 或者 private 将导致 modal-base 生成匿名子类 declaration 失败
export abstract class BaseElement<T = {}> extends HTMLElement {
  static observedAttributes: string[]; // WebAPI 中是实时检查这个列表
  static observedPropertys: string[];
  static observedStores: Store<unknown>[];
  static adoptedStyleSheets: (CSSStyleSheet | Sheet<unknown>)[];

  readonly state: T;

  /**@final */
  __renderRoot: HTMLElement | ShadowRoot;
  /**@final */
  __isMounted: boolean;

  constructor(shadow = true) {
    super();
    this.setState = this.setState.bind(this);
    this.willMount = this.willMount.bind(this);
    this.render = this.render.bind(this);
    this.mounted = this.mounted.bind(this);
    this.shouldUpdate = this.shouldUpdate.bind(this);
    this.__update = this.__update.bind(this);
    this.updated = this.updated.bind(this);
    this.__connectAttribute = this.__connectAttribute.bind(this);
    this.__disconnectAttribute = this.__disconnectAttribute.bind(this);
    this.__connectProperty = this.__connectProperty.bind(this);
    this.__disconnectProperty = this.__disconnectProperty.bind(this);
    this.__connectStore = this.__connectStore.bind(this);
    this.__disconnectStore = this.__disconnectStore.bind(this);
    this.attributeChanged = this.attributeChanged.bind(this);
    this.propertyChanged = this.propertyChanged.bind(this);
    this.unmounted = this.unmounted.bind(this);

    this.__renderRoot = shadow ? this.attachShadow({ mode: 'open' }) : this;
    const { observedAttributes, observedPropertys, observedStores, adoptedStyleSheets } = new.target;
    if (observedAttributes) {
      observedAttributes.forEach(attr => {
        this.__connectAttribute(attr, true);
      });
    }
    if (observedPropertys) {
      observedPropertys.forEach(prop => {
        this.__connectProperty(prop);
      });
    }
    if (observedStores) {
      observedStores.forEach(store => {
        this.__connectStore(store);
      });
    }
    if (adoptedStyleSheets) {
      if (this.shadowRoot) {
        this.shadowRoot.adoptedStyleSheets = adoptedStyleSheets;
      } else {
        document.adoptedStyleSheets = document.adoptedStyleSheets.concat(adoptedStyleSheets);
      }
    }
  }

  /**@final */
  setState(payload: Partial<T>) {
    Object.assign(this.state, payload);
    addMicrotask(this.__update);
  }

  /**@lifecycle */
  willMount() {}

  /**@lifecycle */
  render() {
    return html`
      <slot></slot>
    `;
  }

  /**@lifecycle */
  mounted() {}

  /**@lifecycle */
  shouldUpdate() {
    return true;
  }

  /**@final */
  __update() {
    if (this.__isMounted && this.shouldUpdate()) {
      render(this.render(), this.__renderRoot);
      this.updated();
    }
  }

  /**@helper */
  update() {
    this.__update();
  }

  /**@lifecycle */
  updated() {}

  /**@final */
  __connectAttribute(str: string, isAttr = false) {
    const prop = isAttr ? kebabToCamelCase(str) : str;
    const attr = isAttr ? str : camelToKebabCase(prop);
    if (typeof this[prop] === 'function') {
      throw `Don't use attribute with the same name as native methods`;
    }
    // Native attribute，no need difine property
    // e.g: `id`, `title`, `hidden`, `alt`, `lang`
    if (this[prop] !== undefined) return;
    const con = this.constructor as typeof BaseElement;
    if (!con.observedAttributes) con.observedAttributes = [];
    con.observedAttributes.push(attr);
    // !!! Custom property shortcut access only supports `string` type
    Object.defineProperty(this, prop, {
      configurable: true,
      get() {
        // Return empty string if attribute does not exist
        return this.getAttribute(attr) || '';
      },
      set(v: string) {
        if (v === null) {
          this.removeAttribute(attr);
        } else {
          this.setAttribute(attr, v);
        }
      },
    });
  }
  /**@helper */
  connectAttribute(str: string, isAttr = false) {
    this.__connectAttribute(str, isAttr);
  }

  /**@final */
  __disconnectAttribute(str: string, isAttr = false) {
    const prop = isAttr ? kebabToCamelCase(str) : str;
    const attr = isAttr ? str : camelToKebabCase(prop);
    Object.defineProperty(this, prop, { configurable: true, enumerable: true, writable: true });
    const con = this.constructor as typeof BaseElement;
    con.observedAttributes = deleteSubArr(con.observedAttributes, [attr]);
  }
  /**@helper */
  disconnectAttribute(str: string, isAttr = false) {
    this.__disconnectAttribute(str, isAttr);
  }

  /**@final */
  __connectProperty(prop: string) {
    if (prop in this) return;
    const con = this.constructor as typeof BaseElement;
    if (!con.observedPropertys) con.observedPropertys = [];
    con.observedPropertys.push(prop);
    let propValue: any = this[prop];
    Object.defineProperty(this, prop, {
      configurable: true,
      get() {
        return propValue;
      },
      set(v) {
        if (v !== propValue) {
          propValue = v;
          if (this.__isMounted) {
            this.propertyChanged(prop, propValue, v);
            addMicrotask(this.__update);
          }
        }
      },
    });
  }
  /**@helper */
  connectProperty(prop: string) {
    this.__connectProperty(prop);
  }

  /**@final */
  __disconnectProperty(prop: string) {
    Object.defineProperty(this, prop, { configurable: true, enumerable: true, writable: true });
    const con = this.constructor as typeof BaseElement;
    con.observedPropertys = deleteSubArr(con.observedPropertys, [prop]);
  }
  /**@helper */
  disconnectPropertys(prop: string) {
    this.__disconnectProperty(prop);
  }

  /**@final */
  __connectStore(store: Store<unknown>) {
    if (!store[HANDLES_KEY]) {
      throw new Error('`observedStores` only support store module');
    }

    const con = this.constructor as typeof BaseElement;
    if (!con.observedStores) con.observedStores = [];
    con.observedStores.push(store);
    connect(store, this.__update);
  }
  /**@helper */
  connectStore(store: Store<unknown>) {
    this.__connectStore(store);
  }

  /**@final */
  __disconnectStore(store: Store<unknown>) {
    disconnect(store, this.__update);
    const con = this.constructor as typeof BaseElement;
    con.observedStores = deleteSubArr(con.observedStores, [store]);
  }
  /**@helper */
  disconnectStore(store: Store<unknown>) {
    this.__disconnectStore(store);
  }

  // 同步触发
  /**@lifecycle */
  propertyChanged(_name: string, _oldValue: any, _newValue: any) {}
  // 异步触发
  /**@lifecycle */
  attributeChanged(_name: string, _oldValue: string, _newValue: string) {}

  /**@lifecycle */
  unmounted() {}

  /**@private */
  /**@final */
  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (this.__isMounted) {
      this.attributeChanged(name, oldValue, newValue);
      addMicrotask(this.__update);
    }
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
    this.unmounted();
    this.__isMounted = false;
  }
}

export abstract class GemElement<T = {}> extends BaseElement<T> {
  /**@private */
  /**@final */
  connectedCallback() {
    this.willMount();
    render(this.render(), this.__renderRoot);
    this.mounted();
    this.__isMounted = true;
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
      render(this.render(), this.__renderRoot);
      this.mounted();
      this.__isMounted = true;
    });
  }
}

// 重写了全局 customElements
// 原因是方便多个独立 app 同时使用 gem
// 用户使用和 gem 同名的元素不会生效也不会报错
const define = customElements.define.bind(customElements);
customElements.define = function(
  tagName: string,
  Class: typeof GemElement | typeof AsyncGemElement,
  options?: ElementDefinitionOptions,
) {
  if (!customElements.get(tagName)) {
    define(tagName, Class, options);
  }
};
