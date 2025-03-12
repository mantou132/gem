import { CustomElementRegistry, CustomEvent, Element, Event, EventTarget, HTMLElement } from '@lit-labs/ssr-dom-shim';

class CSSStyleSheet {}

class Document {
  get adoptedStyleSheets() {
    return [];
  }
  createTreeWalker() {
    return {};
  }
  createTextNode() {
    return {};
  }
  createElement() {
    return {};
  }
}

Object.assign(globalThis, {
  customElements: new CustomElementRegistry(),
  CSSStyleSheet,
  HTMLElement,
  Element,
  Event,
  CustomEvent,
  CustomElementRegistry,
  EventTarget,
  Document,
  document: new Document(),
});
