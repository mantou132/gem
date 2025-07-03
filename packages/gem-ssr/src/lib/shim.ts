import { JSDOM } from 'jsdom';

export const dom = new JSDOM(``, {
  url: 'https://example.org/',
  referrer: 'https://example.com/',
  contentType: 'text/html',
  includeNodeLocations: true,
  storageQuota: 10000000,
});

const {
  customElements,
  CustomElementRegistry,
  CSSStyleSheet,
  HTMLElement,
  Element,
  Text,
  Comment,
  Node,
  SVGElement,
  Document,
  document,
  history,
  location,
  addEventListener,
  XMLSerializer,
  CDATASection,
  NodeFilter,
} = dom.window;

declare global {
  interface CSSStyleSheet {
    _text: string;
  }
}

document.adoptedStyleSheets = [];

CSSStyleSheet.prototype.replaceSync = function (text) {
  this._text = text;
};

const attachInternals = HTMLElement.prototype.attachInternals;
HTMLElement.prototype.attachInternals = function (this: HTMLElement) {
  const internals = attachInternals.apply(this);
  internals.states = new Set();
  Object.defineProperty(internals, 'ariaDisabled', {
    configurable: true,
    value: undefined,
    writable: true,
  });
  return internals;
};

Object.assign(globalThis, {
  // nativeQueueMicrotask
  nQM: queueMicrotask,

  // Web 独有 API
  customElements,
  CustomElementRegistry,
  CSSStyleSheet,
  HTMLElement,
  Element,
  Text,
  Comment,
  Node,
  SVGElement,
  Document,
  document,
  history,
  location,
  addEventListener,
  XMLSerializer,
  CDATASection,
  NodeFilter,

  // Node 中没有，只用来占位
  requestAnimationFrame: () => {},
  requestIdleCallback: () => {},
});
