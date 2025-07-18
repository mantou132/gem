import { addMicrotask, createUpdater, type Updater } from './utils';

export type Store<T = any> = Updater<T>;

/**@internal */
export const _StoreListenerMap = new WeakMap<Store<any>, Set<() => void>>();

export function createStore<T = any>(originStore: T) {
  const store = createUpdater(originStore, (value?: Partial<T>) => {
    // biome-ignore lint/plugin/assign: 未知类型
    Object.assign(store, value);
    _StoreListenerMap.get(store)?.forEach((func) => addMicrotask(func));
  });
  _StoreListenerMap.set(store, new Set<() => void>());
  return store;
}

export function connect(store: Store<any>, func: () => void) {
  const listeners = _StoreListenerMap.get(store);
  listeners?.add(func);
  return () => listeners?.delete(func);
}
