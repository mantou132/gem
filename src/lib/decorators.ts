import { BaseElement } from './element';
import { Store } from './store';
import { Sheet, camelToKebabCase } from './utils';

export function attribute(target: BaseElement, prop: string): any {
  const con = target.constructor as typeof BaseElement;
  if (!con.observedAttributes) con.observedAttributes = [];
  con.observedAttributes.push(camelToKebabCase(prop));
}

export function property(target: BaseElement, prop: string): any {
  const con = target.constructor as typeof BaseElement;
  if (!con.observedPropertys) con.observedPropertys = [];
  con.observedPropertys.push(prop);
}

export function emitter(target: BaseElement, event: string): any {
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
