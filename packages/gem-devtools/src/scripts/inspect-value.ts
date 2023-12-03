import type { Path } from '../store';

declare function inspect(arg: any): void;

export const inspectValue = (path: Path, token: string) => {
  const value = window.__GEM_DEVTOOLS__PRELOAD__.readProp(path);
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
