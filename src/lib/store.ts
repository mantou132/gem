import { addMicrotask, GemError } from './utils';

export const StoreListenerMap = new WeakMap<object, Set<Function>>();

// 限制 `updateStore` 的参数类型
export type Store<T> = T & { '': string };

export function createStore<T extends object>(originStore: T) {
  if (StoreListenerMap.has(originStore)) {
    throw new GemError('argument error');
  }
  StoreListenerMap.set(originStore, new Set<Function>());
  return originStore as Store<T>;
}

interface StoreObjectSet {
  [store: string]: object;
}
export type StoreSet<T> = {
  [P in keyof T]: T[P] & Store<T[P]>;
};
export function createStoreSet<T extends StoreObjectSet>(originStoreSet: T) {
  const keys = Object.keys(originStoreSet);
  keys.forEach(key => {
    createStore(originStoreSet[key]);
  });

  return originStoreSet as StoreSet<T>;
}

export function updateStore<T extends object>(store: Store<T>, value: Partial<T>) {
  Object.assign(store, value);
  const listeners = StoreListenerMap.get(store);
  listeners?.forEach(func => {
    addMicrotask(func);
  });
}

export function connect<T extends object>(store: Store<T>, func: Function) {
  const listeners = StoreListenerMap.get(store);
  listeners?.add(func);
}

export function disconnect<T extends object>(store: Store<T>, func: Function) {
  const listeners = StoreListenerMap.get(store);
  listeners?.delete(func);
}
