const updaterSet = new Set<() => void>();
export function addMicrotask(func: () => void) {
  if (typeof func !== 'function') return;
  if (!updaterSet.size) {
    // delayed execution callback after updating store
    globalThis.queueMicrotask(() => {
      updaterSet.forEach((func) => func());
      updaterSet.clear();
    });
  }
  updaterSet.delete(func);
  updaterSet.add(func);
}

export function absoluteLocation(currentPath = '', relativePath = '') {
  const { pathname, search, hash } = new URL(relativePath, location.origin + currentPath);
  return pathname + search + hash;
}

interface PoolEventMap {
  start: Event;
  end: Event;
}

/**
 * `EventTarget` safari not support
 * https://bugs.webkit.org/show_bug.cgi?id=174313
 */
const EventTarget = globalThis.Image || Object; // support nodejs
export class Pool<T> extends EventTarget {
  addEventListener: <K extends keyof PoolEventMap>(
    type: K,
    listener: (this: Pool<T>, ev: PoolEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions,
  ) => void;
  constructor() {
    super();
    // https://bugs.webkit.org/show_bug.cgi?id=198674
    Object.setPrototypeOf(this, Pool.prototype);
  }
  currentId = 0;
  count = 0;
  pool = new Map<number, T>();

  add(item: T) {
    if (!this.pool.size) this.dispatchEvent(new CustomEvent('start'));
    this.pool.set(this.count, item);
    this.count += 1;
  }

  get(): T | undefined {
    const item = this.pool.get(this.currentId);
    if (item) {
      this.pool.delete(this.currentId);
      this.currentId += 1;
      if (!this.pool.size) this.dispatchEvent(new CustomEvent('end'));
    }
    return item;
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
    }
    super(param);
    /**
     * can't extend `URLSearchParams`
     * https://bugs.webkit.org/show_bug.cgi?id=198674
     */
    Object.setPrototypeOf(this, QueryString.prototype);
  }

  concat(param: any) {
    let query: any;
    if (typeof param === 'string') {
      query = Object.fromEntries(new URLSearchParams(param).entries());
    } else {
      query = param;
    }
    Object.keys(query).forEach((key) => {
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

export const SheetToken = Symbol('sheet token');

export type Sheet<T> = {
  [P in keyof T]: P;
} & { [SheetToken]: CSSStyleSheet };

declare global {
  interface CSSStyleSheet {
    replaceSync: (str: string) => void;
  }

  interface CSSRuleList {
    item(index: number): CSSStyleRule;
  }
  interface ShadowRoot {
    adoptedStyleSheets: CSSStyleSheet[];
  }
  interface Document {
    adoptedStyleSheets: CSSStyleSheet[];
  }
}

type StyledType = 'id' | 'class' | 'tag';
interface StyledValue {
  str: string;
  key: string;
  type: StyledType;
}
interface StyledValues {
  [index: string]: StyledValue;
}

/**
 * !!! 目前只有 Chrome/FirefoxNightly 支持
 * https://bugzilla.mozilla.org/show_bug.cgi?id=1520690
 *
 * 创建 style sheet 用于 `adoptedStyleSheets`，不支持样式更新
 * @param rules string | Record<string, string> 不能动态更新的 css
 * @param mediaQuery string 媒体查询 StyleSheet.media.mediaText
 */
export function createCSSSheet<T extends StyledValues>(rules: T | string, mediaQuery = ''): Sheet<T> {
  const styleSheet = new CSSStyleSheet();
  const sheet: any = {};
  styleSheet.media.mediaText = mediaQuery;
  let style = '';
  if (typeof rules === 'string') {
    style = rules;
  } else {
    Object.keys(rules).forEach((key: keyof T) => {
      sheet[key] = rules[key].type === 'tag' ? key : `${key}-${rules[key].key}`;
      style += rules[key].str.replace(/&/g, sheet[key]);
    });
  }
  styleSheet.replaceSync(style);
  sheet[SheetToken] = styleSheet;
  return sheet as Sheet<T>;
}

export function randomStr(number = 5, origin = '0123456789abcdefghijklmnopqrstuvwxyz') {
  const len = origin.length;
  let str = '';
  for (let i = 0; i < number; i++) {
    str += origin[Math.floor(Math.random() * len)];
  }
  return str;
}

// 只支持一层嵌套
// https://drafts.csswg.org/css-nesting-1/
function flatStyled(style: string, type: StyledType): StyledValue {
  const subStyle: string[] = [];
  let str =
    `& {${style.replace(new RegExp('&.*{((.|\n)*)}', 'g'), function (substr) {
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

export function cleanObject<T extends Record<string, unknown>>(o: T) {
  Object.keys(o).forEach((key: string) => {
    const k = key as keyof T;
    delete o[k];
  });
  return o;
}

export class GemError extends Error {
  constructor(msg: string) {
    super(msg);
    this.message = `gem: ${this.message}`;
  }
}

export function isArrayChange(newValues: any[], oldValues: any[]) {
  const length = newValues.length;
  for (let i = 0; i < length; i++) {
    if (newValues[i] !== oldValues[i]) return true;
  }
  return false;
}

export function styleMap(obj: Partial<CSSStyleDeclaration>) {
  let styleString = '';
  for (const key in obj) {
    styleString += `${camelToKebabCase(key)}:${obj[key]};`;
  }
  return styleString;
}

export function classMap(obj: Record<string, boolean>) {
  let classList = ' ';
  for (const className in obj) {
    if (obj[className]) {
      classList += `${className} `;
    }
  }
  return classList;
}
