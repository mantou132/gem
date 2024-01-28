import { Store, connect, updateStore, useStore } from '@mantou/gem/lib/store';
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

/**Serialized `TemplateResult` */
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

/**Segmentation search word */
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

export type UseCacheStoreOptions<T> = {
  cacheExcludeKeys?: (keyof T)[];
  // 指定缓存 key 前缀
  prefix?: string | (() => string | undefined);
  // 重新初始化 store，例如切换用户
  depStore?: Store<NonPrimitive>;
};

/**Create auto cache(localStorage) Store */
export function useCacheStore<T extends Record<string, any>>(
  storageKey: string,
  initStore: T,
  options?: UseCacheStoreOptions<T>,
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

  const [store, updater] = useStore<T>(getStoreStore(key));

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

  return [store, updater, saveStore] as const;
}

/**@deprecated use `useCacheStore` */
export function createCacheStore<T extends Record<string, any>>(
  storageKey: string,
  initStore: T,
  options?: UseCacheStoreOptions<T>,
) {
  const [store, , save] = useCacheStore(storageKey, initStore, options);
  return [store, save] as const;
}

// 是链接需要使用 img 渲染
export function isRemoteIcon(icon: string | Element | DocumentFragment): icon is string {
  return typeof icon === 'string' && !!icon.trim().match(/^(http|[./])/);
}

/**
 * Pass additional fields
 *
 * not support async function
 */
export class DyPromise<T, E extends Record<string, unknown>> extends Promise<T> {
  static new<T, E extends Record<string, unknown>>(
    executor: (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void,
    props: E,
  ) {
    const instance = new DyPromise<T, E>(executor);
    return Object.assign(instance, props);
  }
  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null,
  ) {
    const result = super.then<TResult1, TResult2>(onfulfilled, onrejected);
    return Object.assign(result, this) as unknown as DyPromise<TResult1 | TResult2, E> & E;
  }
  catch<TResult>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null) {
    const result = super.catch(onrejected);
    return Object.assign(result, this) as unknown as DyPromise<TResult | T, E> & E;
  }
  finally(onfinally?: (() => void) | null | undefined) {
    const result = super.finally(onfinally);
    return Object.assign(result, this) as unknown as DyPromise<T, E> & E;
  }
}
