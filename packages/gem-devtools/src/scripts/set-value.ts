import { Path } from '../store';

// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/devtools/inspectedWindow/eval#helpers
declare let $0: any;

export const setValue = (path: Path, value: string | number | boolean | null) => {
  const key = String(path.pop());

  // 同 inspect-value
  const obj = path.reduce((p, c, index) => {
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

  obj[key] = value;
};
