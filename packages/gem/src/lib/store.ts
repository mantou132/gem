import { addMicrotask, createUpdater } from './utils';

export type Store<T = any> = ReturnType<typeof createUpdater<T>>;

export const StoreListenerMap = new WeakMap<Store<any>, Set<() => void>>();

export function createStore<T = any>(originStore: T) {
  const store = createUpdater(originStore, (value?: Partial<T>) => {
    Object.assign(store, value);
    StoreListenerMap.get(store)?.forEach((func) => addMicrotask(func));
  });
  StoreListenerMap.set(store, new Set<() => void>());
  return store;
}

export function connect(store: Store<any>, func: () => void) {
  const listeners = StoreListenerMap.get(store);
  listeners?.add(func);
  return () => listeners?.delete(func);
}
