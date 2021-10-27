const microtaskSet = new Set<() => void>();
export function addMicrotask(func: () => void) {
  if (typeof func !== 'function') return;
  if (!microtaskSet.size) {
    // delayed execution callback after updating store
    globalThis.queueMicrotask(() => {
      microtaskSet.forEach((func) => func());
      microtaskSet.clear();
    });
  }
  microtaskSet.delete(func);
  microtaskSet.add(func);
}

const microtaskStack: (() => void)[] = [];

function execMicrotaskStack() {
  for (let i = microtaskStack.length - 1; i >= 0; i--) {
    microtaskStack[i]();
  }
  microtaskStack.length = 0;
}

/**
 * 添加回调函数到微任务队列栈；
 * 先进后执行；
 */
export function addMicrotaskToStack(func: () => void) {
  if (!microtaskStack.length) {
    addMicrotask(execMicrotaskStack);
  }
  microtaskStack.push(func);
}

export function absoluteLocation(currentPath = '', relativePath = '') {
  const { pathname, search, hash } = new URL(relativePath, location.origin + currentPath);
  return pathname + search + hash;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export type NonPrimitive = object;

interface LinkedListEventMap {
  start: Event;
  end: Event;
}
interface LinkedListItem<T> {
  value: T;
  prev?: LinkedListItem<T>;
  next?: LinkedListItem<T>;
}
// work on nodejs
export class LinkedList<T extends NonPrimitive> extends (globalThis.EventTarget || Object) {
  addEventListener: <K extends keyof LinkedListEventMap>(
    type: K,
    listener: (this: LinkedList<T>, ev: LinkedListEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions,
  ) => void;

  pool = new Map<T, LinkedListItem<T>>();
  firstItem?: LinkedListItem<T>;
  lastItem?: LinkedListItem<T>;

  // 添加已存在的项目时会删除老的项目
  add(value: T) {
    const item: LinkedListItem<T> = { value };
    if (!this.firstItem) {
      this.dispatchEvent(new CustomEvent('start'));
      this.firstItem = item;
    }
    if (this.lastItem) {
      this.lastItem.next = item;
      item.prev = this.lastItem;
    }
    this.lastItem = item;

    const existItem = this.pool.get(value);
    if (existItem) {
      if (existItem.prev) {
        existItem.prev.next = existItem.next;
      } else {
        this.firstItem = existItem.next;
      }
      if (existItem.next) {
        existItem.next.prev = existItem.prev;
      }
    }

    this.pool.set(value, item);
  }

  get(): T | undefined {
    const firstItem = this.firstItem;
    if (!firstItem) return;

    this.pool.delete(firstItem.value);

    this.firstItem = firstItem.next;
    if (!this.firstItem) {
      this.lastItem = undefined;
      this.dispatchEvent(new CustomEvent('end'));
    }
    return firstItem.value;
  }
}

export class PropProxyMap<T extends NonPrimitive, V = unknown> extends WeakMap<T, Record<string, V>> {
  get(ele: T) {
    let proxy = super.get(ele);
    if (!proxy) {
      proxy = {};
      this.set(ele, proxy);
    }
    return proxy;
  }
}

export function isObject(value: any) {
  return typeof value === 'object';
}

declare global {
  interface URLSearchParams {
    entries(): Iterable<readonly [string | number | symbol, any]>;
  }
}
export class QueryString extends URLSearchParams {
  constructor(param?: any) {
    super(param);
    if (param instanceof QueryString) {
      return param;
    }
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

  #stringify = (value: any) => (isObject(value) ? JSON.stringify(value) : value);

  setAny(key: string, value: any) {
    if (Array.isArray(value)) {
      this.delete(key);
      value.forEach((e) => this.append(key, this.#stringify(e)));
    } else {
      this.set(key, this.#stringify(value));
    }
  }

  #parse = (value: any) => {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  getAny(key: string) {
    return this.getAnyAll(key)[0];
  }

  getAnyAll(key: string) {
    return this.getAll(key)
      .filter((e) => e !== '')
      .map((e) => this.#parse(e));
  }

  toString() {
    const string = super.toString();
    return string ? `?${string}` : '';
  }

  toJSON() {
    return this.toString();
  }
}

/**
 * 写纯文本，仅用于 IDE HTML 高亮
 *
 * 不同于 lit-html 的 `html` 模版函数，写 attribute 时必须手动写引号并自行进行 html 编码
 */
export function raw(arr: TemplateStringsArray, ...args: any[]) {
  return arr.reduce((prev, current, index) => prev + (args[index - 1] ?? '') + current);
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

export type StyledType = 'id' | 'class' | 'keyframes';
export interface StyledValueObject {
  styledContent: string;
  type: StyledType;
}
export interface StyledKeyValuePair {
  [key: string]: StyledValueObject;
}

/**
 * !!! 目前只有 Chrome/FirefoxNightly 支持
 * https://bugzilla.mozilla.org/show_bug.cgi?id=1520690
 *
 * 创建 style sheet 用于 `adoptedStyleSheets`，不支持样式更新
 * @param rules string | Record<string, string> 不能动态更新的 css
 * @param mediaQuery string 媒体查询 StyleSheet.media.mediaText
 */
export function createCSSSheet<T extends StyledKeyValuePair>(rules: T | string, mediaQuery = ''): Sheet<T> {
  const styleSheet = new CSSStyleSheet();
  const sheet: any = {};
  styleSheet.media.mediaText = mediaQuery;
  let style = '';
  if (typeof rules === 'string') {
    style = rules;
  } else {
    Object.keys(rules).forEach((key: keyof T) => {
      sheet[key] = `${key}-${randomStr()}`;
      style += rules[key].styledContent.replace(/&/g, sheet[key]);
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

const nestingRuleRegExp = new RegExp('&.*{((.|\n)*)}', 'g');
// 只支持一层嵌套
// https://drafts.csswg.org/css-nesting-1/
function flatStyled(style: string, type: StyledType): StyledValueObject {
  const nestingRules: string[] = [];
  let styledContent =
    `& {${style.replace(nestingRuleRegExp, (substr) => {
      nestingRules.push(substr);
      return '';
    })}}` + nestingRules.join('');
  styledContent = styledContent.replace(/&/g, type === 'class' ? '.&' : '#&');
  return { styledContent, type };
}

// 写 css 文本，在 CSSStyleSheet 中使用，使用 styed-components 高亮
// 暂时不支持 `at` 规则
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
  keyframes: (arr: TemplateStringsArray, ...args: any[]): StyledValueObject => {
    const keyframesContent = raw(arr, ...args);
    const styledContent = `@keyframes & {${keyframesContent}}`;
    return { styledContent, type: 'keyframes' };
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

export function removeItems(target: any[], items: any[]) {
  const set = new Set(items);
  return target.filter((e) => {
    if (set.has(e)) {
      set.delete(e);
      return false;
    }
    return true;
  });
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

export const partMap = classMap;
