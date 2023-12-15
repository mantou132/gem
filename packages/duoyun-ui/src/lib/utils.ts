import { createStore, Store, connect, updateStore } from '@mantou/gem/lib/store';
import { render, TemplateResult } from '@mantou/gem/lib/element';
import { NonPrimitive, cleanObject } from '@mantou/gem/lib/utils';

import { isNullish } from '../lib/types';

/**Similar `lodash.keyBy` */
export function convertToMap<T extends Record<string, any>, V = T>(list: (T | null)[], key: keyof T): Record<string, V>;
export function convertToMap<T extends Record<string, any>, V = string>(
  list: (T | null)[],
  key: keyof T,
  value: keyof T,
  fallback?: any,
): Record<string, V>;
export function convertToMap<T extends Record<string, any>, V = string>(
  list: (T | null)[],
  key: any,
  value?: any,
  fallback?: any,
) {
  const argLength = arguments.length;
  const isSelf = argLength === 2;
  const hasFallback = argLength === 4;
  const result: Record<string, V> = {};
  list.forEach((item) => {
    if (item) {
      // missing `value` is self
      result[item[key]] = value ? item[value] : item;
    }
  });
  return new Proxy(result, {
    get: (target, prop: string) => {
      return prop in target || isSelf ? target[prop] : hasFallback ? fallback : prop;
    },
  });
}

// https://developer.mozilla.org/en-US/docs/Web/API/structuredClone
export const structuredClone = (window as any).structuredClone || ((v: any) => JSON.parse(JSON.stringify(v)));

/**Get Cascader/Tree max deep*/
export function getCascaderDeep<T>(list: T[], cascaderKey: keyof T) {
  const getChildren = (t: T): number => {
    const children = t[cascaderKey] as unknown as T[] | undefined;
    if (Array.isArray(children)) {
      let l = 0;
      children.forEach((e) => {
        const ll = getChildren(e);
        if (ll > l) l = ll;
      });
      return 1 + l;
    }
    return 0;
  };
  let l = 0;
  list.forEach((e) => {
    const ll = getChildren(e);
    if (ll > l) l = ll;
  });
  return 1 + l;
}

/**
 * Get the value from the bottom layer,
 * compare the new value of the upper layer to choose a new value, bubbling to the top layer
 */
export function getCascaderBubbleWeakMap<
  T extends Record<string, any>,
  F extends (_: T) => any,
  K = Exclude<ReturnType<F>, undefined | null>,
>(
  list: T[] | undefined,
  cascaderKey: keyof T,
  getValue: F,
  comparerFn: (bottomValue: K, topValue: K) => K = (a) => a,
  setValueCallback?: (item: T, bubbleValue: K) => void,
) {
  const map = new WeakMap<T, K>();
  const getItemValue = (e: T) => {
    const v = map.get(e) ?? getValue(e);
    if (isNullish(v)) return;
    return v;
  };
  const check = (l?: T[]) =>
    l?.forEach((e) => {
      check(e[cascaderKey]);
      let value: K | undefined | null = getItemValue(e);
      e[cascaderKey]?.forEach((e: T) => {
        const v = getItemValue(e);
        value = isNullish(value) ? v : comparerFn(v, value);
      });
      if (!isNullish(value)) {
        map.set(e, value);
        setValueCallback?.(e, value);
      }
    });
  check(list);
  return map;
}

/**Simple proxy object, use prop name as a fallback when reading prop */
export function proxyObject(object: Record<string | symbol | number, any>) {
  return new Proxy(object, {
    get: (target, prop) => {
      return prop in target ? target[prop] : prop;
    },
  });
}

/**Deep read prop */
export function readProp(obj: Record<string, any>, paths: string | number | symbol | string[]) {
  return Array.isArray(paths) ? paths.reduce((p, c) => p?.[c], obj) : obj[paths as string];
}

/**Until the callback function resolve */
export async function forever<T>(callback: () => Promise<T>, interval = 1000): Promise<T> {
  try {
    return await callback();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    await sleep(interval);
    return forever(callback, interval);
  }
}

export function polling(fn: (args?: any[]) => any, delay: number) {
  let timer = 0;
  let hasExit = false;
  const poll = async () => {
    try {
      await fn();
    } catch {
    } finally {
      if (!hasExit) {
        timer = window.setTimeout(poll, delay);
      }
    }
  };
  poll();
  return (haveNext = false) => {
    hasExit = true;
    haveNext ? setTimeout(() => clearTimeout(timer), delay) : clearTimeout(timer);
  };
}

export function sleep(ms = 3000) {
  return new Promise((res) => setTimeout(res, ms));
}

export function throttle<T extends (...args: any) => any>(
  fn: T,
  wait = 500,
  { leading = false, maxWait = Infinity }: { leading?: boolean; maxWait?: number } = {},
) {
  let timer = 0;
  let first = 0;
  const exec = (...rest: Parameters<T>) => {
    timer = window.setTimeout(() => (timer = 0), wait);
    fn(...(rest as any));
  };
  return (...rest: Parameters<T>) => {
    const now = Date.now();
    if (!timer) first = now;
    if (now - first > maxWait) {
      first = now;
      clearTimeout(timer);
      exec(...rest);
    } else if (leading && !timer) {
      exec(...rest);
    } else {
      clearTimeout(timer);
      timer = window.setTimeout(() => exec(...rest), wait);
    }
  };
}

export function debounce<T extends (...args: any) => any>(fn: T, wait = 500) {
  let timer = 0;
  let result: any = undefined;
  return (...rest: Parameters<T>) => {
    if (!timer) {
      timer = window.setTimeout(() => {
        timer = 0;
      }, wait);
      result = fn(...(rest as any));
    }
    return result;
  };
}

export function once<T extends (...args: any) => any>(fn: T) {
  let timer = 0;
  let result: ReturnType<T>;
  return (...rest: Parameters<T>) => {
    if (!timer) {
      timer = 1;
      result = fn(...(rest as any));
      return result;
    }
    return result;
  };
}

/**Ignore the first call */
export function omitOnce<T extends (...args: any) => any>(fn: T) {
  let timer = 0;
  return (...rest: Parameters<T>) => {
    if (timer) {
      fn(...(rest as any));
    } else {
      timer = 1;
    }
  };
}

/**Only let the last add Promise take effect, don’t care about the order of Resolve */
export class OrderlyPromisePool {
  pool: any[] = [];
  add<T>(promise: Promise<T>, callback: (r: T) => void) {
    const newIndex = this.pool.length;
    const removeCallback = () => this.pool.splice(newIndex, 1, null);
    this.pool.push(callback);
    promise
      .then((r) => {
        if (this.pool[this.pool.length - 1] === callback) {
          callback(r);
          this.pool.length = 0;
        } else {
          removeCallback();
        }
      })
      .catch((err) => {
        removeCallback();
        throw err;
      });
  }
}

export enum ComparerType {
  Eq = 'eq',
  Gte = 'gte',
  Lte = 'lte',
  Lt = 'lt',
  Gt = 'gt',
  Ne = 'ne',
  Miss = 'miss',
  Have = 'have',
}

/**Serialize comparer */
export function comparer(a: any, comparer: ComparerType, b: any) {
  const aNum = Number(a);
  const bNum = Number(b);
  const isNumber = !isNaN(aNum) && !isNaN(aNum);
  switch (comparer) {
    case ComparerType.Eq:
      return a == b;
    case ComparerType.Ne:
      return a != b;
    case ComparerType.Gt:
      return isNumber ? aNum > bNum : a > b;
    case ComparerType.Gte:
      return isNumber ? aNum >= bNum : a >= b;
    case ComparerType.Lt:
      return isNumber ? aNum < bNum : a < b;
    case ComparerType.Lte:
      return isNumber ? aNum <= bNum : a <= b;
    case ComparerType.Have:
      return a?.includes?.(b);
    case ComparerType.Miss:
      return !a?.includes?.(b);
    default:
      return false;
  }
}

export function getStringFromTemplate(o: TemplateResult | string, incorrect = false): string {
  if (o instanceof TemplateResult) {
    if (incorrect) {
      const string = o.getTemplateElement().content.textContent || '';
      return string + ' ' + o.values.map((e) => getStringFromTemplate(e as string | TemplateResult)).join(' ');
    }
    const div = document.createElement('div');
    render(o, div);
    return div.textContent || '';
  }
  return String(o);
}

export function splitString(s: string) {
  return s.split(/(?:\s|\/)+/);
}

/**Search */
export function isIncludesString(origin: string | TemplateResult, search: string, caseSensitive = false) {
  const getStr = (s: string) => (caseSensitive ? s : s.toLowerCase()).trim();
  const oString = getStr(getStringFromTemplate(origin, true));
  const sString = getStr(search);
  return splitString(sString).some((s) => oString.includes(s));
}

/**In addition to the parameter element, set the `inert` attribute for all element */
export function setBodyInert(modal: HTMLElement) {
  const map = new Map<HTMLElement, boolean>();
  [...document.body.children].forEach((e) => {
    if (e instanceof HTMLElement) {
      map.set(e, e.inert);
      e.inert = true;
    }
  });
  modal.inert = false;
  return () => {
    map.forEach((inert, ele) => {
      ele.inert = inert;
    });
    modal.inert = true;
  };
}

/**Create auto cache(localStorage) Store */
export function createCacheStore<T extends Record<string, any>>(
  storageKey: string,
  initStore: T,
  options?: {
    cacheExcludeKeys?: (keyof T)[];
    prefix?: string | (() => string | undefined);
    depStore?: Store<NonPrimitive>;
  },
) {
  const getKey = () => {
    const prefix = typeof options?.prefix === 'function' ? options.prefix() : options?.prefix;
    return prefix ? `${prefix}@${storageKey}` : storageKey;
  };

  const getStoreStore = (key: string) => {
    let storeCache: T | undefined = undefined;
    try {
      storeCache = JSON.parse(localStorage.getItem(key) || '{}');
    } catch (err) {
      //
    }
    return storeCache ? { ...initStore, ...storeCache } : initStore;
  };

  const cacheExcludeKeys = new Set(options?.cacheExcludeKeys || []);
  let key = getKey();

  const store = createStore<T>(getStoreStore(key));

  if (options?.depStore) {
    connect(options.depStore, () => {
      const newKey = getKey();
      if (newKey !== key) {
        key = newKey;
        updateStore(cleanObject(store), getStoreStore(newKey));
      }
    });
  }

  const saveStore = () => {
    localStorage.setItem(
      key,
      JSON.stringify(Object.fromEntries(Object.entries(store).filter(([key]) => !cacheExcludeKeys.has(key)))),
    );
  };

  window.addEventListener('pagehide', saveStore);

  return [store, saveStore] as const;
}
