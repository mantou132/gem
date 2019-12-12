const updaterSet = new Set<Function>();
export function addMicrotask(func: Function) {
  if (!updaterSet.size) {
    // delayed execution callback after updating store
    window.queueMicrotask(() => {
      updaterSet.forEach(func => func());
      updaterSet.clear();
    });
  }
  updaterSet.delete(func);
  updaterSet.add(func);
}

interface PoolEventMap {
  start: Event;
  end: Event;
}
export class Pool<T> extends EventTarget {
  addEventListener: <K extends keyof PoolEventMap>(
    type: K,
    listener: (this: Pool<T>, ev: PoolEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions,
  ) => void;

  currentId = 0;
  count = 0;
  pool = new Map<number, T>();

  add(item: T) {
    if (!this.pool.size) this.dispatchEvent(new CustomEvent('start'));
    this.pool.set(this.count, item);
    this.count += 1;
  }

  get(): T {
    const item = this.pool.get(this.currentId);
    if (item) {
      this.pool.delete(this.currentId);
      this.currentId += 1;
      if (!this.pool.size) this.dispatchEvent(new CustomEvent('end'));
    }
    return item;
  }
}

enum StorageType {
  LOCALSTORAGE = 'localStorage',
  SESSIONSTORAGE = 'sessionStorage',
}
export class Storage<T> {
  cache = {};
  get(key: string, type: StorageType): T {
    if (!this.cache[type]) this.cache[type] = {};
    if (key in this.cache[type]) return this.cache[type][key];

    const value = window[type].getItem(key);

    if (!value) return undefined;
    try {
      const result: T = JSON.parse(value);
      this.cache[type][key] = result;
      return result;
    } catch (e) {
      window[type].removeItem(key);
    }
  }
  getLocal(key: string): T {
    return this.get(key, StorageType.LOCALSTORAGE);
  }
  getSession(key: string): T {
    return this.get(key, StorageType.SESSIONSTORAGE);
  }
  set(key: string, value: T, type: StorageType) {
    if (!this.cache[type]) this.cache[type] = {};
    this.cache[type][key] = value;
    return window[type].setItem(key, JSON.stringify(value));
  }
  setLocal(key: string, value: T) {
    return this.set(key, value, StorageType.LOCALSTORAGE);
  }
  setSession(key: string, value: T) {
    return this.set(key, value, StorageType.SESSIONSTORAGE);
  }
}

declare global {
  interface URLSearchParams {
    entries(): Iterable<readonly [string | number | symbol, any]>;
  }
}
export class QueryString extends URLSearchParams {
  constructor(param: any) {
    if (param instanceof QueryString) {
      return param;
    } else if (typeof param === 'string') {
      super(param);
    } else if (param) {
      super();
      Object.keys(param).forEach(key => {
        this.append(key, param[key]);
      });
    } else {
      super();
    }
  }

  concat(param: any) {
    let query: any;
    if (typeof param === 'string') {
      query = Object.fromEntries(new URLSearchParams(param).entries());
    } else {
      query = param;
    }
    Object.keys(query).forEach(key => {
      this.append(key, query[key]);
    });
  }

  toString() {
    const string = super.toString();
    return string ? `?${string}` : '';
  }

  toJSON() {
    return this.toString();
  }
}

// 写 html 文本
export function raw(arr: TemplateStringsArray, ...args: any[]) {
  return arr.reduce((prev, current, index) => prev + (args[index - 1] || '') + current);
}

// 写 css 文本，在 CSSStyleSheet 中使用
export function css(arr: TemplateStringsArray, ...args: any[]) {
  return raw(arr, ...args);
}

export type Sheet<T> = {
  [P in keyof T]: P;
};

declare global {
  interface CSSStyleSheet {
    replaceSync: (str: string) => void;
  }

  interface CSSRuleList {
    item(index: number): CSSStyleRule;
  }
  interface ShadowRoot {
    adoptedStyleSheets: Sheet<unknown>[];
  }
  interface Document {
    adoptedStyleSheets: Sheet<unknown>[];
  }
}

const rulesWeakMap = new WeakMap<Sheet<unknown>, any>();
// rules 引用的是字符串，所以不能动态更新
export function createCSSSheet<T>(rules: T | string, mediaQuery = ''): T extends string ? CSSStyleSheet : Sheet<T> {
  let cssSheet = rulesWeakMap.get(rules);
  if (!cssSheet) {
    const sheet = new CSSStyleSheet();
    sheet.media.mediaText = mediaQuery;
    let style = '';
    if (typeof rules === 'string') {
      style = rules;
    } else {
      Object.keys(rules).forEach(key => {
        sheet[key] = rules[key].type === 'tag' ? key : `${key}-${rules[key].key}`;
        style += rules[key].str.replace(/&/g, sheet[key]);
      });
      rulesWeakMap.set(rules, sheet);
    }
    sheet.replaceSync(style);
    cssSheet = sheet;
  }
  return cssSheet;
}

function randomStr(number = 5, origin = '0123456789abcdefghijklmnopqrstuvwxyz') {
  const len = origin.length;
  let str = '';
  for (let i = 0; i < number; i++) {
    str += origin[Math.floor(Math.random() * len)];
  }
  return str;
}

// 只支持一层嵌套
// https://drafts.csswg.org/css-nesting-1/
function flatStyled(style: string, type: 'id' | 'class' | 'tag') {
  const subStyle = [];
  let str =
    `& {${style.replace(new RegExp('&.*{(.*)}', 'gs'), function(substr) {
      subStyle.push(substr);
      return '';
    })}}` + subStyle.join('');
  if (type !== 'tag') str = str.replace(/&/g, type === 'class' ? '.&' : '#&');
  return { str, key: randomStr(), type };
}

// 写 css 文本，在 CSSStyleSheet 中使用，使用 styed-components 高亮
//
// createCSSSheet({
//   red: styled.class`
//     background: red;
//     &:hover {
//       background: blue;
//     }
//   `,
// });

export const styled = {
  class: (arr: TemplateStringsArray, ...args: any[]) => {
    const style = raw(arr, ...args);
    return flatStyled(style, 'class');
  },
  id: (arr: TemplateStringsArray, ...args: any[]) => {
    const style = raw(arr, ...args);
    return flatStyled(style, 'id');
  },
  tag: (arr: TemplateStringsArray, ...args: any[]) => {
    const style = raw(arr, ...args);
    return flatStyled(style, 'tag');
  },
};

export function camelToKebabCase(str: string) {
  return str.replace(/[A-Z]/g, ($1: string) => '-' + $1.toLowerCase());
}

export function kebabToCamelCase(str: string) {
  return str.replace(/-(.)/g, (_substr, $1: string) => $1.toUpperCase());
}

export function emptyFunction() {
  // 用于占位的空函数
}
