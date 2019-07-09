export const HANDLES_KEY = Symbol('handles key')

const FUNC_MARK_KEY = Symbol('function mark')

interface StoreTrait {
  [HANDLES_KEY]: Set<Function>
}
export type Store<T> = T & StoreTrait
type StoreSet<T> = {
  [P in keyof T]: T[P] & Store<T[P]>
}

export function createStore<T extends object>(originStore: T): Store<T> {
  const store = originStore as Store<T>
  store[HANDLES_KEY] = new Set<Function>()
  return store
}

export function createStoreSet<T extends object>(originStoreSet: T) {
  const keys = Object.keys(originStoreSet)
  keys.forEach(key => {
    createStore(originStoreSet[key])
  })

  return originStoreSet as StoreSet<T>
}

const updaterSet = new Set<Function>()
export function updateStore<T extends Store<unknown>>(storeModule: T, value: Partial<Omit<T, keyof StoreTrait>>) {
  if (!updaterSet.size) {
    // delayed execution callback after updating store
    queueMicrotask(() => {
      updaterSet.forEach(func => func(value))
      updaterSet.clear()
    })
  }
  Object.assign(storeModule, value)
  const listeners = storeModule[HANDLES_KEY]
  listeners.forEach(func => {
    if (func[FUNC_MARK_KEY].has(storeModule)) {
      // 更新遍历顺序
      updaterSet.delete(func)
      updaterSet.add(func)
    }
  })
}

export function connect<T extends Store<unknown>>(storeModule: T, func: Function) {
  const listeners = storeModule[HANDLES_KEY]
  if (!func[FUNC_MARK_KEY]) func[FUNC_MARK_KEY] = new Set()
  func[FUNC_MARK_KEY].add(storeModule)
  listeners.add(func)
}

export function disconnect<T extends Store<unknown>>(storeModule: T, func: Function) {
  const listeners = storeModule[HANDLES_KEY]
  listeners.delete(func)
}
