export const STORE_MODULE = Symbol('key: get store module')
export const STORE_MODULE_KEY = Symbol('key: get store module key')

const FUNC_MARK_KEY = Symbol('function mark')
const HANDLES_KEY = Symbol('handles key')

interface StoreModuleTrait<T> {
  [STORE_MODULE]: StoreModule<T>
  [STORE_MODULE_KEY]: string
  [HANDLES_KEY]: Map<string, Set<Function>>
}
export type StoreModule<T> = T & StoreModuleTrait<T>
type Store<T> = {
  [P in keyof T]: T[P] & StoreModule<T[P]>
}

export function createStore<T extends object>(originStore: T): Store<T> {
  const handler = {
    has(target: Store<T>, key: string) {
      return key in target
    },
    get(target: Store<T>, key: string) {
      return target[key]
    },
    set(target: Store<T>, key: string, value: StoreModule<unknown>) {
      target[key] = value
      const listeners = value[HANDLES_KEY].get(key)
      listeners.forEach(func => func[FUNC_MARK_KEY].has(key) && func(value))
      return true
    },
  }

  const proxy = new Proxy(originStore, handler) as Store<T>
  const keys = Object.keys(originStore)
  keys.forEach(key => {
    const storeModule = originStore[key] as StoreModule<unknown>
    storeModule[STORE_MODULE] = storeModule
    storeModule[STORE_MODULE_KEY] = key
    storeModule[HANDLES_KEY] = new Map([[key, new Set<Function>()]])
    proxy[key] = storeModule
  })

  return proxy
}

export function createStoreModule<T extends object>(origin: T) {
  const store = createStore({ origin })
  return store.origin
}

const updaterSet = new Set<Function>()
export function updateStore<T extends StoreModule<unknown>>(
  storeModule: T,
  value: Partial<Omit<T, keyof StoreModuleTrait<unknown>>>,
) {
  if (!updaterSet.size) {
    // delayed execution callback after updating store
    queueMicrotask(() => {
      updaterSet.forEach(func => func(value))
      updaterSet.clear()
    })
  }
  const storeKey = storeModule[STORE_MODULE_KEY]
  Object.assign(storeModule[STORE_MODULE], value) // Equivalent set store[key]
  const listeners = storeModule[HANDLES_KEY].get(storeKey)
  listeners.forEach(func => {
    if (func[FUNC_MARK_KEY].has(storeKey)) {
      updaterSet.add(func)
    }
  })
}

export function connect<T extends StoreModule<unknown>>(storeModule: T, func: Function) {
  const storeKey = storeModule[STORE_MODULE_KEY]
  const listeners = storeModule[HANDLES_KEY].get(storeKey)
  if (!func[FUNC_MARK_KEY]) func[FUNC_MARK_KEY] = new Set()
  func[FUNC_MARK_KEY].add(storeKey)
  listeners.add(func)
}

export function disconnect<T extends StoreModule<unknown>>(storeModule: T, func: Function) {
  const storeKey = storeModule[STORE_MODULE_KEY]
  const listeners = storeModule[HANDLES_KEY].get(storeKey)
  listeners.delete(func)
}
