import type { Path } from '../store';

type DevToolsHookPreload = {
  readProp: (path: Path) => any;
  traverseDom: (callback: (element: Element) => void) => void;
};
declare global {
  interface Window {
    __GEM_DEVTOOLS__PRELOAD__: DevToolsHookPreload;
  }
}

// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/devtools/inspectedWindow/eval#helpers
declare let $0: any;

export function preload() {
  window.__GEM_DEVTOOLS__PRELOAD__ = {
    // [["shadowRoot", ""], "querySelector", "[ref=child-ref]"]
    // 只有 constructor 函数会当成对象读取
    readProp(path) {
      return path.reduce((p, k, index) => {
        const c = typeof k === 'string' && (k.startsWith('gem@') || k.startsWith('Symbol.')) ? Symbol.for(k) : k;
        if (typeof p === 'function' && path[index - 1] !== 'constructor') {
          if (Array.isArray(c)) {
            return p(...c);
          } else {
            return p(c);
          }
        } else {
          if (Array.isArray(c)) {
            return c.reduce((pp, cc) => pp || (cc === '' ? p : p[cc]), undefined);
          } else {
            const value = p[c];
            return typeof value === 'function' && c !== 'constructor' ? value.bind(p) : value;
          }
        }
      }, $0);
    },
    traverseDom(callback) {
      // 同 dom-stat 迭代
      const temp: Element[] = [document.documentElement];
      while (!!temp.length) {
        const element = temp.pop()!;
        callback(element);
        if (element.shadowRoot?.firstElementChild) temp.push(element.shadowRoot.firstElementChild);
        if (element.firstElementChild) temp.push(element.firstElementChild);
        if (element.nextElementSibling) temp.push(element.nextElementSibling);
      }
    },
  };
}
