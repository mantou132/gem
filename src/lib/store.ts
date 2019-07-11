export const HANDLES_KEY = Symbol('handles key');

export interface StoreTrait {
  [HANDLES_KEY]: Set<Function>;
}

export type Store<T> = T & StoreTrait;

export type StoreSet<T> = {
  [P in keyof T]: T[P] & Store<T[P]>;
};

export function createStore<T extends object>(originStore: T): Store<T> {
  const store = originStore as Store<T>;
  store[HANDLES_KEY] = new Set<Function>();
  return store;
}

export function createStoreSet<T extends object>(originStoreSet: T) {
  const keys = Object.keys(originStoreSet);
  keys.forEach(key => {
    createStore(originStoreSet[key]);
  });

  return originStoreSet as StoreSet<T>;
}

const updaterSet = new Set<Function>();
export function updateStore<T extends Store<unknown>>(store: T, value: Partial<Omit<T, keyof StoreTrait>>) {
  if (!updaterSet.size) {
    // delayed execution callback after updating store
    queueMicrotask(() => {
      updaterSet.forEach(func => func(value));
      updaterSet.clear();
    });
  }
  Object.assign(store, value);
  const listeners = store[HANDLES_KEY];
  listeners.forEach(func => {
    // 更新遍历顺序
    updaterSet.delete(func);
    updaterSet.add(func);
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
