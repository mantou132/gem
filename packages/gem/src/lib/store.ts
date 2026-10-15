import { getRequestValue, isolate, isServer } from './server';
import { addMicrotask, assignState, createUpdater, type Updater } from './utils';

export type Store<T = any> = Updater<T>;

/**@internal */
export const _StoreListenerMap = new WeakMap<Store<any>, Set<() => void>>();

const createListeners = () => new Set<() => void>();

// SSR 时当前请求中更新过的有 key 的 store，渲染后输出到页面中
const updatedStores = new Map<string, Store<any>>();

/** SSR 时当前请求中更新过的有 key 的 store，供 `@mantou/gem-ssr` 使用 */
export const _getUpdatedStores = () => getRequestValue(updatedStores, () => new Map());

// 客户端读取服务端渲染时 store 的值
let restoreStore: ((key: string) => object | undefined) | undefined;

/** 设置客户端恢复 store 的方法，供 `@mantou/gem-ssr` 使用 */
export function _setStoreRestorer(restorer: typeof restoreStore) {
  restoreStore = restorer;
}

/**
 * 创建 store，`key` 用来在 SSR 时同步服务端的值，`swc-plugin-gem` 的 `ssr` 选项会为模块顶层的 store 自动添加
 */
export function createStore<T = any>(originStore: T, key?: string) {
  const listeners = createListeners();
  // SSR 时每个请求使用独立的值
  const store = isolate(
    createUpdater(originStore, (value?: Partial<T>) => {
      assignState(store, value);
      listeners.forEach(addMicrotask);
      if (!isServer) return;
      // SSR 时请求中添加的监听器只属于当前请求，其他请求更新 store 时不会触发
      getRequestValue(listeners, createListeners).forEach(addMicrotask);
      const updated = _getUpdatedStores();
      // 不在请求中时更新的是全局的值，客户端也一样
      if (key && updated !== updatedStores) updated.set(key, store);
    }),
  );
  if (key && restoreStore) assignState(store, restoreStore(key));
  _StoreListenerMap.set(store, listeners);
  return store;
}

export function connect(store: Store<any>, func: () => void) {
  const storeListeners = _StoreListenerMap.get(store);
  const listeners = storeListeners && getRequestValue(storeListeners, createListeners);
  listeners?.add(func);
  return () => listeners?.delete(func);
}
