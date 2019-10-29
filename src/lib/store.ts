import { addMicrotask } from './utils';

// 不使用符号，方便跨 Realms
export const HANDLES_KEY = 'gem@storeHandlesKey';

export interface StoreTrait {
  [HANDLES_KEY]: Set<Function>;
}

export type Store<T> = T & StoreTrait;

export type StoreSet<T> = {
  [P in keyof T]: T[P] & Store<T[P]>;
};

export function createStore<T extends object>(originStore: T): Store<T> {
  const store = originStore as Store<T>;
  // 序列化时忽略
  Object.defineProperty(store, HANDLES_KEY, { enumerable: false, value: new Set<Function>(), writable: true });
  return store;
}

export function createStoreSet<T extends object>(originStoreSet: T) {
  const keys = Object.keys(originStoreSet);
  keys.forEach(key => {
    createStore(originStoreSet[key]);
  });

  return originStoreSet as StoreSet<T>;
}

export function updateStore<T extends Store<unknown>>(store: T, value: Partial<Omit<T, keyof StoreTrait>>) {
  Object.assign(store, value);
  const listeners = store[HANDLES_KEY];
  listeners.forEach(func => {
    addMicrotask(func);
  });
}

export function connect<T extends Store<unknown>>(store: T, func: Function) {
  const listeners = store[HANDLES_KEY];
  listeners.add(func);
}

export function disconnect<T extends Store<unknown>>(store: T, func: Function) {
  const listeners = store[HANDLES_KEY];
  listeners.delete(func);
}
