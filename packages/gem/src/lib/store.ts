import type { NonPrimitive } from './utils';
import { addMicrotask, GemError } from './utils';

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

export function updateStore<T extends NonPrimitive>(store: Store<T>, value?: Partial<T>) {
  Object.assign(store, value);
  StoreListenerMap.get(store)?.forEach((func) => {
    addMicrotask(func);
  });
}

export function useStore<T extends NonPrimitive>(originStore: T) {
  const store = createStore(originStore);
  return [store, (value?: Partial<T>) => updateStore(store, value)] as const;
}

export function connect<T extends NonPrimitive>(store: Store<T>, func: () => void) {
  const listeners = StoreListenerMap.get(store);
  listeners?.add(func);
  return () => {
    listeners?.delete(func);
  };
}

export function disconnect<T extends NonPrimitive>(store: Store<T>, func: () => void) {
  const listeners = StoreListenerMap.get(store);
  listeners?.delete(func);
}
