import { addMicrotask, GemError, NonPrimitive } from './utils';

export const StoreListenerMap = new WeakMap<NonPrimitive, Set<() => void>>();

// 限制 `updateStore` 的参数类型
export type Store<T> = T & { '': string };

export function createStore<T extends NonPrimitive>(originStore: T) {
  if (StoreListenerMap.has(originStore)) {
    throw new GemError('argument error');
  }
  StoreListenerMap.set(originStore, new Set<() => void>());
  return originStore as Store<T>;
}

interface StoreObjectSet {
  [store: string]: NonPrimitive;
}
export type StoreSet<T> = {
  [P in keyof T]: T[P] & Store<T[P]>;
};
export function createStoreSet<T extends StoreObjectSet>(originStoreSet: T) {
  const keys = Object.keys(originStoreSet);
  keys.forEach((key) => {
    createStore(originStoreSet[key]);
  });

  return originStoreSet as StoreSet<T>;
}

export function updateStore<T extends NonPrimitive>(store: Store<T>, value: Partial<T>) {
  Object.assign(store, value);
  const listeners = StoreListenerMap.get(store);
  listeners?.forEach((func) => {
    addMicrotask(func);
  });
}

export function connect<T extends NonPrimitive>(store: Store<T>, func: () => void) {
  const listeners = StoreListenerMap.get(store);
  listeners?.add(func);
}

export function disconnect<T extends NonPrimitive>(store: Store<T>, func: () => void) {
  const listeners = StoreListenerMap.get(store);
  listeners?.delete(func);
}
