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
 * 先进后执行，使用这个函数可以改变嵌套的元素 `mounted` 的顺序；
 */
export function addMicrotaskToStack(func: () => void) {
  if (!microtaskStack.length) {
    addMicrotask(execMicrotaskStack);
  }
  microtaskStack.push(func);
}

// 不编码 hash 用于比较
export function absoluteLocation(currentPath = '', relativePath = '') {
  const { pathname, search, hash } = new URL(relativePath, location.origin + currentPath);
  return pathname + search + decodeURIComponent(hash);
}

export type NonPrimitive = object;

export function addListener<T extends EventTarget, A extends Parameters<T['addEventListener']>>(
  target: T,
  type: A[0],
  listener: A[1],
  options?: A[2],
) {
  target.addEventListener(type, listener, options);
  return () => target.removeEventListener(type, listener, options);
}

interface LinkedListEventMap {
  start: Event;
  end: Event;
}
export interface LinkedListItem<T> {
  value: T;
  prev?: LinkedListItem<T>;
  next?: LinkedListItem<T>;
}

export class LinkedList<T = any> extends EventTarget {
  declare addEventListener: <K extends keyof LinkedListEventMap>(
    type: K,
    listener: (this: LinkedList<T>, ev: LinkedListEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions,
  ) => void;

  #map = new Map<T, LinkedListItem<T>>();
  #firstItem?: LinkedListItem<T>;
  #lastItem?: LinkedListItem<T>;

  #delete(value: T) {
    const existItem = this.#map.get(value);
    if (existItem) {
      if (existItem.prev) {
        existItem.prev.next = existItem.next;
      } else {
        this.#firstItem = existItem.next;
      }
      if (existItem.next) {
        existItem.next.prev = existItem.prev;
      } else {
        this.#lastItem = existItem.prev;
      }
      this.#map.delete(value);
    }
    return existItem;
  }

  get size() {
    return this.#map.size;
  }

  get first() {
    return this.#firstItem;
  }

  get last() {
    return this.#lastItem;
  }

  isSuperLinkOf(subLink: LinkedList<T>) {
    let subItem = subLink.first;
    if (!subItem) return true;
    let item = this.find(subItem.value);
    while (item && item.value === subItem.value) {
      subItem = subItem.next;
      if (!subItem) return true;
      item = item.next;
    }
    return false;
  }

  find(value: T) {
    return this.#map.get(value);
  }

  // 添加到尾部，已存在时会删除老的项目
  // 如果是添加第一个，start 事件会在添加前触发，避免处理事件重复的逻辑
  add(value: T) {
    if (!this.#lastItem) {
      this.dispatchEvent(new CustomEvent('start'));
    }
    const item: LinkedListItem<T> = this.#delete(value) || { value };
    item.prev = this.#lastItem;
    if (item.prev) {
      item.prev.next = item;
    }
    item.next = undefined;
    this.#lastItem = item;
    if (!this.#firstItem) {
      this.#firstItem = item;
    }
    this.#map.set(value, item);
  }

  // 删除这个元素后没有其他元素时立即出发 end 事件
  delete(value: T) {
    const deleteItem = this.#delete(value);
    if (!this.#firstItem) {
      this.dispatchEvent(new CustomEvent('end'));
    }
    return deleteItem;
  }

  // 获取头部元素
  // 会从链表删除
  get(): T | undefined {
    const firstItem = this.#firstItem;
    if (!firstItem) return;
    this.delete(firstItem.value);
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

export class QueryString extends URLSearchParams {
  constructor(param?: any) {
    super(param);
  }

  // support `{ key: ObjectValue }`
  concat(param: any) {
    let query: any;
    if (typeof param === 'string') {
      query = Object.fromEntries(new URLSearchParams(param).entries());
    } else {
      query = param;
    }
    Object.entries(query).forEach(([key, value]) => {
      this.append(key, this.#stringify(value));
    });
  }

  #stringify = (value: any) => (typeof value === 'string' ? value : JSON.stringify(value));

  setAny(key: string, value: any) {
    if (Array.isArray(value)) {
      this.delete(key);
      value.forEach((e) => this.append(key, this.#stringify(e)));
    } else {
      const v = this.#stringify(value);
      v ? this.set(key, v) : this.delete(key);
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

// 跨多个 gem 工作
export const SheetToken = Symbol.for('gem@sheetToken');

export type Sheet<T> = {
  [P in keyof T]: P;
} & { [SheetToken]: CSSStyleSheet };

export type StyledType = 'id' | 'class' | 'keyframes';
export interface StyledValueObject {
  styledContent: string;
  type: StyledType;
}
export interface StyledKeyValuePair {
  [key: string]: StyledValueObject;
}

/**
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
      sheet[key] = `${key as string}-${randomStr()}`;
      style += rules[key].styledContent.replace(/&/g, sheet[key]);
    });
  }
  styleSheet.replaceSync(style);
  sheet[SheetToken] = styleSheet;
  return sheet as Sheet<T>;
}

export function randomStr(len = 5): string {
  const str = Math.random().toString(36).slice(2).slice(0, len);
  if (str.length < len) return str + randomStr(len - str.length);
  return str;
}

const nestingRuleRegExp = new RegExp('&.*{((.|\n)*)}', 'g');
// 只支持一层嵌套
// https://drafts.csswg.org/css-nesting-1/
// https://bugzilla.mozilla.org/show_bug.cgi?id=1648037
// https://bugs.webkit.org/show_bug.cgi?id=223497
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
  if (oldValues.length !== length) return true;
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

export function objectMapToString<T = any>(
  object: Record<string, T>,
  separate: string,
  toString: (key: string, value: T) => string,
) {
  let result = separate;
  for (const key in object) {
    const s = toString(key, object[key]);
    result += s ? s + separate : '';
  }
  return result;
}

// Wait: Typescript lib dom CSSStyleDeclaration anchor position
type StyleProp =
  | keyof CSSStyleDeclaration
  | `--${string}`
  | 'scrollbarWidth'
  | 'scrollbarColor'
  | 'anchorDefault'
  | 'anchorName';

export type StyleObject = Partial<Record<StyleProp, string | number | false | undefined | null>>;

// 不支持 webkit 属性
export function styleMap(object: StyleObject) {
  return objectMapToString(object, ';', (key, value) =>
    value || value === 0 ? `${camelToKebabCase(key)}:${value}` : '',
  );
}

export function classMap(object: Record<string, string | number | boolean | undefined | null>) {
  return objectMapToString(object, ' ', (key, value) => (value ? key : ''));
}

export const partMap = classMap;

// https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/exportparts
export function exportPartsMap(object: Record<string, string | boolean | undefined | null>) {
  return objectMapToString(object, ',', (key, value) =>
    value === true || key === value ? key : value ? `${key}:${value}` : '',
  );
}

declare global {
  interface PropertyIndexedKeyframes extends StyleObject {}
  interface Keyframe extends StyleObject {}
}

/**
 * @example
 * ```css
 * animation: 150ms ease 0ms showMask;`
 * @keyframes showMask {
 *   from {
 *     opacity: 0;
 *   }
 * }
 * ```
 */
// export function createCSSAnimation(
//   keyframes: PropertyIndexedKeyframes | Keyframe[],
//   options?: number | (KeyframeEffectOptions & { name: string }),
// ) {
//   const frames = new Map<number, StyleObject>();
//   if (Array.isArray(keyframes)) {
//     keyframes.forEach((keyframe, index) => {
//       const offset = keyframes.length === 1 ? 1 : keyframe.offset || index / (keyframes.length - 1);
//       frames.set(offset, {
//         ...keyframe,
//         // https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API/Keyframe_Formats#attributes
//         cssOffset: undefined,
//         offset: keyframe.cssOffset,
//         composite: undefined,
//         animationComposition: keyframe.composite,
//         easing: undefined,
//         animationTimingFunction: keyframe.easing,
//       } as StyleObject);
//     });
//   } else {
//     const offsetList: (number | null)[] = Array.isArray(keyframes.offset)
//       ? keyframes.offset
//       : keyframes.offset === undefined
//         ? []
//         : [keyframes.offset];
//     if (offsetList.length && offsetList.at(-1) !== 1) offsetList.push(1);

//     const setStyle = (offset: number, key: string, value: string | number | null | undefined) => {
//       const style = frames.get(offset) || {};
//       switch (key) {
//         case 'offset':
//           break;
//         case 'cssOffset':
//           Reflect.set(style, 'offset', value);
//           break;
//         case 'composite':
//           Reflect.set(style, 'animationComposition', value);
//           break;
//         case 'easing':
//           Reflect.set(style, 'animationTimingFunction', value);
//           break;
//         default:
//           Reflect.set(style, key, value);
//       }
//       frames.set(offset, style);
//     };
//     for (const key in keyframes) {
//       const framesValue = keyframes[key];
//       !Array.isArray(framesValue)
//         ? setStyle(1, key, framesValue)
//         : framesValue.length === 1
//           ? setStyle(1, key, framesValue[0])
//           : framesValue.forEach((value, index) =>
//               setStyle(offsetList[index] ?? index / (framesValue.length - 1), key, value),
//             );
//     }
//   }

//   let framesStr = '';
//   frames.forEach((rules, offset) => {
//     framesStr += `${(offset * 100).toFixed()}%{${styleMap(rules)}}`;
//   });

//   if (options) {
//     const {
//       // 只能使用 ms 数字
//       duration = 0,
//       easing = '',
//       delay = 0,
//       iterations = 1,
//       direction = '',
//       fill = '',
//       name = `ani-${randomStr()}`,
//     } = typeof options === 'number' ? ({ duration: options } as Exclude<typeof options, number>) : options;
//     return `${duration}ms ${easing} ${delay}ms ${iterations} ${direction} ${fill} ${name};@keyframes ${name}{${framesStr}}`;
//   }

//   return framesStr;
// }
