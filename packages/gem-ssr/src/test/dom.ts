// 客户端测试使用的浏览器环境，服务端渲染在 worker 中执行，见 `ssr.ts`
import { JSDOM } from 'jsdom';

const { window } = new JSDOM('', { url: 'http://localhost/' });

window.document.adoptedStyleSheets = [];

// Node 内部也使用全局 `Event`，不能替换，所以在派发时转换成 jsdom 的事件
const { EventTarget, Event, CustomEvent, HTMLElement } = window;
const { dispatchEvent } = EventTarget.prototype;
EventTarget.prototype.dispatchEvent = function (this: EventTarget, event: Event) {
  if (event instanceof Event) return dispatchEvent.call(this, event);
  const { type, bubbles, cancelable, composed, detail } = event as CustomEvent;
  return dispatchEvent.call(this, new CustomEvent(type, { bubbles, cancelable, composed, detail }));
};

const { attachInternals } = HTMLElement.prototype;
HTMLElement.prototype.attachInternals = function (this: HTMLElement) {
  const internals = attachInternals.apply(this);
  Object.defineProperties(internals, {
    states: { value: new Set() },
    ariaDisabled: { value: undefined, writable: true },
  });
  return internals;
};

for (const key of [
  'document',
  'customElements',
  'history',
  'location',
  'addEventListener',
  'removeEventListener',
  'ShadowRoot',
  'CSSStyleSheet',
  'HTMLElement',
  'Element',
  'Text',
  'Comment',
  'Node',
  'NodeFilter',
  'SVGElement',
  'Document',
] as const) {
  Object.assign(globalThis, {
    [key]: typeof window[key] === 'function' && /^[a-z]/.test(key) ? window[key].bind(window) : window[key],
  });
}
Object.assign(globalThis, {
  window: globalThis,
  requestAnimationFrame: (callback: FrameRequestCallback) => setTimeout(() => callback(performance.now())),
});
