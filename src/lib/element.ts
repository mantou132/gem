/* eslint-disable @typescript-eslint/no-empty-function */

import * as lit from 'lit-html';
import { TemplateResult } from 'lit-html';
import { connect, disconnect, HANDLES_KEY, Store } from './store';
import { Pool, addMicrotask, Sheet } from './utils';

import { repeat as litRepeat } from 'lit-html/directives/repeat';
import { ifDefined as litIfDefined } from 'lit-html/directives/if-defined';

let litHtml = {
  html: lit.html,
  svg: lit.svg,
  render: lit.render,
  directive: lit.directive,
  repeat: litRepeat,
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

const { html, svg, render, directive, repeat, ifDefined } = litHtml;
export { html, svg, render, directive, repeat, ifDefined, TemplateResult };

const idElementMap = new Map<string, BaseElement<any>>();
// id 必须全局唯一才能正确跳转
// 只能检查自定义元素的 ID
const checkHash = () => {
  const hash = window.location.hash.substr(1);
  if (hash) {
    const element = idElementMap.get(hash);
    if (element) {
      element.scrollIntoView();
    }
  }
};
window.addEventListener('hashchange', checkHash);

if (document.readyState === 'complete') {
  checkHash();
} else {
  window.addEventListener('load', checkHash);
}

// global render task pool
const renderTaskPool = new Pool<Function>();
const exec = () =>
  window.requestAnimationFrame(function callback(timestamp) {
    const task = renderTaskPool.get();
    if (task) {
      task();
      if (performance.now() - timestamp < 16) {
        callback(timestamp);
        return;
      }
    }
    exec();
  });

exec();

// final 字段如果使用 symbol 或者 private 将导致 modal-base 生成匿名子类 declaration 失败
export abstract class BaseElement<T = {}> extends HTMLElement {
  static observedAttributes = ['id']; // WebAPI 中是实时检查这个列表
  static observedPropertys?: string[];
  static observedStores?: Store<unknown>[];
  static adoptedStyleSheets?: CSSStyleSheet[] | Sheet<unknown>[];

  readonly state: T;

  /**@final */
  _renderRoot: HTMLElement | ShadowRoot;
  /**@final */
  _isMounted: boolean; // do't modify

  constructor(shadow = true) {
    super();
    this.setState = this.setState.bind(this);
    this.willMount = this.willMount.bind(this);
    this.render = this.render.bind(this);
    this.mounted = this.mounted.bind(this);
    this.shouldUpdate = this.shouldUpdate.bind(this);
    this.update = this.update.bind(this);
    this.updated = this.updated.bind(this);
    this.connectStores = this.connectStores.bind(this);
    this.disconnectStores = this.disconnectStores.bind(this);
    this.attributeChanged = this.attributeChanged.bind(this);
    this.propertyChanged = this.propertyChanged.bind(this);
    this.unmounted = this.unmounted.bind(this);

    this._renderRoot = shadow ? this.attachShadow({ mode: 'open' }) : this;
    const { observedAttributes, observedPropertys, observedStores, adoptedStyleSheets } = new.target;
    if (observedAttributes) {
      observedAttributes.forEach(attr => {
        Object.defineProperty(this, attr, {
          get: () => {
            return this.getAttribute(attr) || '';
          },
          set: (v: string) => {
            if (v === null) {
              this.removeAttribute(attr);
            } else {
              this.setAttribute(attr, v);
            }
          },
        });
      });
    }
    if (observedAttributes && !observedAttributes.includes('id')) {
      // ID 更改是触发 update，更新 `idElementMap`
      observedAttributes.push('id');
    }
    if (observedPropertys) {
      observedPropertys.forEach(prop => {
        let propValue: any = this[prop];
        Object.defineProperty(this, prop, {
          get: () => {
            return propValue;
          },
          set: v => {
            if (v !== propValue) {
              propValue = v;
              if (this._isMounted) {
                this.propertyChanged(prop, propValue, v);
                addMicrotask(this.update);
              }
            }
          },
        });
      });
    }
    if (observedStores) {
      observedStores.forEach(store => {
        if (!store[HANDLES_KEY]) {
          throw new Error('`observedStores` only support store module');
        }

        connect(store, this.update);
      });
    }
    if (adoptedStyleSheets) {
      (this.shadowRoot || document).adoptedStyleSheets = adoptedStyleSheets;
    }
  }

  /**@final */
  setState(payload: Partial<T>) {
    Object.assign(this.state, payload);
    addMicrotask(this.update);
  }

  willMount() {}

  render() {
    return html`
      <slot></slot>
    `;
  }

  mounted() {}

  shouldUpdate() {
    return true;
  }

  /**@final */
  update() {
    if (this._isMounted && this.shouldUpdate()) {
      render(this.render(), this._renderRoot);
      this.updated();
      idElementMap.set(this.id, this);
    }
  }

  updated() {}

  /**@final */
  connectStores(storeList: Store<unknown>[]) {
    storeList.forEach(store => {
      connect(store, this.update);
    });
  }

  /**@final */
  disconnectStores(storeList: Store<unknown>[]) {
    storeList.forEach(store => {
      disconnect(store, this.update);
    });
  }

  // 同步触发
  propertyChanged(_name: string, _oldValue: any, _newValue: any) {}
  // 异步触发
  attributeChanged(_name: string, _oldValue: string, _newValue: string) {}

  unmounted() {}

  /**@private */
  /**@final */
  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (this._isMounted) {
      this.attributeChanged(name, oldValue, newValue);
      addMicrotask(this.update);
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
        disconnect(store, this.update);
      });
    }
    this.unmounted();
    this._isMounted = false;
  }
}

export abstract class GemElement<T = {}> extends BaseElement<T> {
  /**@private */
  /**@final */
  connectedCallback() {
    this.willMount();
    render(this.render(), this._renderRoot);
    this.mounted();
    idElementMap.set(this.id, this);
    this._isMounted = true;
  }
}

export abstract class AsyncGemElement<T = {}> extends BaseElement<T> {
  /**@final */
  update() {
    renderTaskPool.add(() => {
      if (this.shouldUpdate()) {
        render(this.render(), this._renderRoot);
        this.updated();
        idElementMap.set(this.id, this);
      }
    });
  }

  /**@private */
  /**@final */
  connectedCallback() {
    this.willMount();
    renderTaskPool.add(() => {
      render(this.render(), this._renderRoot);
      this.mounted();
      idElementMap.set(this.id, this);
      this._isMounted = true;
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
