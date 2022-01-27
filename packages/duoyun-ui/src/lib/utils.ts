import { TemplateResult } from '@mantou/gem/lib/element';

import { isNullish } from '../lib/types';

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

export function getCascaderDeep<T>(list: T[], cascaderKey: keyof T) {
  const getChildren = (t: T): number => {
    const chilren = t[cascaderKey] as unknown as T[] | undefined;
    if (Array.isArray(chilren)) {
      let l = 0;
      chilren.forEach((e) => {
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

export function getCascaderBubbleWeakMap<
  T extends Record<string, any>,
  F extends (_: T) => any,
  K = Exclude<ReturnType<F>, undefined | null>,
>(list: T[] | undefined, cascaderKey: keyof T, getValue: F, comparerFn: (a: K, b: K) => K = (a) => a) {
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
      if (!isNullish(value)) map.set(e, value);
    });
  check(list);
  return map;
}

export function proxyObject(object: Record<string | symbol | number, any>) {
  return new Proxy(object, {
    get: (target, prop) => {
      return prop in target ? target[prop] : prop;
    },
  });
}

export function readProp(obj: Record<string, any>, paths: string | number | symbol | string[]) {
  return Array.isArray(paths) ? paths.reduce((p, c) => p?.[c], obj) : obj[paths as string];
}

export async function forever(callback: () => Promise<any>, interval = 1000) {
  try {
    return await callback();
  } catch {
    return new Promise((res) => {
      setTimeout(() => res(forever(callback, interval)), interval);
    });
  }
}

export function polling(fn: (args?: any[]) => Promise<any>, delay: number) {
  let timer = 0;
  const poll = () => {
    fn().finally(() => {
      timer = window.setTimeout(poll, delay);
    });
  };
  poll();
  return (haveNext = false) => {
    haveNext ? setTimeout(() => clearTimeout(timer), delay) : clearTimeout(timer);
  };
}

export function sleep(ms = 3000) {
  return new Promise((res) => setTimeout(res, ms));
}

export function throttle<T extends (...args: any) => any>(fn: T, delay = 500) {
  let timer = 0;
  return (...rest: Parameters<T>) => {
    clearTimeout(timer);
    timer = window.setTimeout(() => fn(...(rest as any)), delay);
  };
}

export function debounce<T extends (...args: any) => any>(fn: T, timeout = 500) {
  let timer = 0;
  let result: any = undefined;
  return (...rest: Parameters<T>) => {
    if (!timer) {
      timer = window.setTimeout(() => {
        timer = 0;
      }, timeout);
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

// https://github.com/tc39/proposal-arraybuffer-base64
export function arrayBufferToBase64(arrayBuffer: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
}

export function base64ToArrayBuffer(s: string) {
  return new Uint8Array([...atob(s)].map((char) => char.charCodeAt(0))).buffer;
}

export async function hash(strOrAb: string | ArrayBuffer, options?: 'string'): Promise<string>;
export async function hash(strOrAb: string | ArrayBuffer, output: 'arrayBuffer'): Promise<ArrayBuffer>;
export async function hash(strOrAb: string | ArrayBuffer, output: 'string' | 'arrayBuffer' = 'string') {
  const ab = typeof strOrAb === 'string' ? new TextEncoder().encode(strOrAb) : strOrAb;
  const buffer = await crypto.subtle.digest('SHA-1', ab);
  if (output === 'arrayBuffer') return buffer;
  return [...new Uint8Array(buffer)].map((e) => e.toString(16).padStart(2, '0')).join('');
}

export function isIncludesString(origin: string | TemplateResult, search: string, caseSensitive = false) {
  const toString = (o: any): string => {
    if (o instanceof TemplateResult) {
      const string = o.getTemplateElement().content.textContent || '';
      return string + o.values.map((e) => toString(e)).join('');
    }
    return String(o);
  };
  const getStr = (s: string) => (caseSensitive ? s : s.toLowerCase()).trim();
  const oString = getStr(toString(origin));
  const sString = getStr(search);
  return sString.split(/(\s|\/)+/).some((s) => oString.includes(s));
}

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
