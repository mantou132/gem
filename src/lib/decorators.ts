import { BaseElement } from './element';
import { Store } from './store';
import { Sheet } from './utils';

export function attribute(target: BaseElement, name: string): any {
  target.connectAttributes([name]);
}
export function property(target: BaseElement, name: string): any {
  target.connectPropertys([name]);
}
export function customElement(name: string) {
  return function(cls: Function) {
    customElements.define(name, cls);
  };
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
