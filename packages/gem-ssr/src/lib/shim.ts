import { CustomElementRegistry, CustomEvent, Element, Event, EventTarget, HTMLElement } from '@lit-labs/ssr-dom-shim';

class CSSStyleSheet {}

Object.assign(globalThis, {
  customElements: new CustomElementRegistry(),
  CSSStyleSheet,
  HTMLElement,
  Element,
  Event,
  CustomEvent,
  CustomElementRegistry,
  EventTarget,
});
