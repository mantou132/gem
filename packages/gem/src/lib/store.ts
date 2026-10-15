import { getRequestValue, isolate, isServer } from './server';
import { addMicrotask, assignState, createUpdater, type Updater } from './utils';

export type Store<T = any> = Updater<T>;

/**@internal */
export const _StoreListenerMap = new WeakMap<Store<any>, Set<() => void>>();

const createListeners = () => new Set<() => void>();

export function createStore<T = any>(originStore: T) {
  const listeners = createListeners();
  // SSR 时每个请求使用独立的值
  const store = isolate(
    createUpdater(originStore, (value?: Partial<T>) => {
      assignState(store, value);
      listeners.forEach(addMicrotask);
      // SSR 时请求中添加的监听器只属于当前请求，其他请求更新 store 时不会触发
      if (isServer) getRequestValue(listeners, createListeners).forEach(addMicrotask);
    }),
  );
  _StoreListenerMap.set(store, listeners);
  return store;
}

export function connect(store: Store<any>, func: () => void) {
  const storeListeners = _StoreListenerMap.get(store);
  const listeners = storeListeners && getRequestValue(storeListeners, createListeners);
  listeners?.add(func);
  return () => listeners?.delete(func);
}
