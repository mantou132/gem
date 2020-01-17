/**
 * target 并非元素，而是类的原型对象
 * 不能在 target 上使用 DOM API
 * 类定义之后立即执行，自定义元素可以在实例化时覆盖原型对象上的属性
 */

import { BaseElement } from './element';
import { Store } from './store';
import { Sheet, camelToKebabCase } from './utils';

export type RefObject<T = BaseElement> = { ref: string; element: T | null };

export function refobject(target: BaseElement, prop: string) {
  const attr = prop;
  const ref: RefObject<BaseElement> = { ref: attr, element: null };
  Object.defineProperty(target, prop, {
    get() {
      const that = this as BaseElement;
      const ele = that.shadowRoot || that;
      ref.element = ele.querySelector(`[ref=${prop}]`);
      return ref;
    },
  });
}

export function attribute(target: BaseElement, prop: string) {
  const con = target.constructor as typeof BaseElement;
  if (!con.observedAttributes) con.observedAttributes = [];
  con.observedAttributes.push(camelToKebabCase(prop));
}

export function property(target: BaseElement, prop: string) {
  const con = target.constructor as typeof BaseElement;
  if (!con.observedPropertys) con.observedPropertys = [];
  con.observedPropertys.push(prop);
}

export function state(target: BaseElement, prop: string) {
  let internal: ElementInternals;
  Object.defineProperty(target, prop, {
    get() {
      return !!internal?.states?.contains(prop);
    },
    set(v: boolean) {
      const that = this as BaseElement;
      if (!internal) {
        internal = that.attachInternals();
      }
      if (internal.states) {
        if (v) {
          internal.states.add(prop);
        } else {
          internal.states.remove(prop);
        }
      }
    },
  });
}

export function slot(target: BaseElement, prop: string) {
  const proto = target as BaseElement & { [index: string]: string };
  proto[prop] = prop;
}

export function part(target: BaseElement, prop: string) {
  const proto = target as BaseElement & { [index: string]: string };
  proto[prop] = prop;
}

export function emitter(target: BaseElement, event: string) {
  const con = target.constructor as typeof BaseElement;
  if (!con.defineEvents) con.defineEvents = [];
  con.defineEvents.push(event);
}

export function adoptedStyle(style: CSSStyleSheet | Sheet<unknown>) {
  return function(cls: Function) {
    const c = cls as typeof BaseElement;
    if (!c.adoptedStyleSheets) c.adoptedStyleSheets = [];
    c.adoptedStyleSheets.push(style);
  };
}

export function connectStore(store: Store<unknown>) {
  // 这里的签名该怎么写？
  return function(cls: Function) {
    const c = cls as typeof BaseElement;
    if (!c.observedStores) c.observedStores = [];
    c.observedStores.push(store);
  };
}

export function customElement(name: string) {
  return function(cls: Function) {
    customElements.define(name, cls);
  };
}
