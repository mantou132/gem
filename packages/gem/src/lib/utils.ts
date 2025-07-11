const { assign, fromEntries, entries, keys } = Object;

// 用原生 Chrome 找不到调用栈
function queueMicrotask(cb: () => void) {
  Promise.resolve().then(cb);
}

const microtaskSet = new Set<() => void>();
export function addMicrotask(func: () => void, method = queueMicrotask) {
  if (microtaskSet.has(func)) return;
  method(() => {
    microtaskSet.delete(func);
    func();
  });
  microtaskSet.add(func);
}

type OverrideFn = {
  name: never;
  apply: never;
  call: never;
  bind: never;
  toString: never;
  prototype: never;
  length: never;
  arguments: never;
  caller: never;
  [Symbol.hasInstance]: never;
  [Symbol.metadata]: never;
};

// 注意 typeof state === 'function' 但是没有 Function 的方法和属性
export function createUpdater<T, Fn = (payload?: Partial<T>) => any>(initState: T, fn: Fn) {
  const state: any = fn;
  // https://github.com/vitejs/vite/issues/18540 现在覆盖 call 也一样会报错
  // setPrototypeOf(state, null);
  delete state.name;
  delete state.length;
  assign(state, initState);
  // ts 不允许直接 Omit 掉 Fn 上的属性
  // 只能利用 ts plugin 移除多余的自动完成项
  return state as Fn & Omit<OverrideFn, keyof T> & T;
}

export type Updater<T, Fn = (payload?: Partial<T>) => any> = ReturnType<typeof createUpdater<T, Fn>>;

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

  /**
   * 添加到尾部，已存在时会删除老的项目
   * 如果是添加第一个，start 事件会在添加前触发，避免处理事件重复的逻辑
   */
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

  /** 删除这个元素后没有其他元素时立即出发 end 事件 */
  delete(value: T) {
    const deleteItem = this.#delete(value);
    if (!this.#firstItem) {
      this.dispatchEvent(new CustomEvent('end'));
    }
    return deleteItem;
  }

  clear() {
    this.#map.clear();
    this.#firstItem = this.#lastItem = undefined;
  }

  /** 获取头部元素，会从链表删除 */
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
  // support `{ key: ObjectValue }`
  concat(param: any) {
    let query: any;
    if (typeof param === 'string') {
      query = fromEntries(new URLSearchParams(param).entries());
    } else {
      query = param;
    }
    entries(query).forEach(([key, value]) => {
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

// 在 html 中引用 class 时使用，仅提供高亮功能
export const styled = raw;

export function randomStr(len = 5): string {
  const str = Math.random()
    .toString(36)
    .slice(2, 2 + len);
  if (str.length < len) return str + randomStr(len - str.length);
  return str;
}

export function camelToKebabCase(str: string) {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

export function kebabToCamelCase(str: string) {
  return str.replace(/-(.)/g, (_substr, $1: string) => $1.toUpperCase());
}

export function cleanObject<T extends Record<string, unknown>>(o: T) {
  keys(o).forEach((key: keyof T) => {
    delete o[key];
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

export function objectMapToString<T = any>(
  object: Record<string, T>,
  separate: string,
  toStr: (key: string, value: T) => string,
) {
  let result = separate;
  for (const key in object) {
    const s = toStr(key, object[key]);
    result += s ? s + separate : '';
  }
  return result;
}

// Wait: Typescript lib dom CSSStyleDeclaration anchor position
type StyleProp = keyof CSSStyleDeclaration | `--${string}` | 'positionAnchor' | 'anchorDefault' | 'anchorName';

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
