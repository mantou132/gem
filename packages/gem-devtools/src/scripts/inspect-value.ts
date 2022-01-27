import type { Path } from '../store';

// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/devtools/inspectedWindow/eval#helpers
declare let $0: any;
declare function inspect(arg: any): void;

export const inspectValue = (path: Path, token: string) => {
  // [["shadowRoot", ""], "querySelector", "[ref=child-ref]"]
  // 只有 constructor 函数会当成对象读取
  const value = path.reduce((p, c, index) => {
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
  if (value instanceof Element) {
    let element = value;
    if (element instanceof HTMLSlotElement) {
      // 只支持 inspect 第一个分配的元素
      element = element.assignedElements()[0] || value;
    }
    inspect(element);
  } else if (typeof value === 'object') {
    // chrome inspect(object) bug?
    const symbol = Object.getOwnPropertySymbols(value)[0];
    if (symbol && symbol.toString() === token) {
      // stylesheet
      console.log(value[symbol]);
    } else {
      console.log(value);
    }
  } else {
    console.dir(value);
    inspect(value);
  }
};
