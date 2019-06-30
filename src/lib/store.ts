export const STORE_MODULE = Symbol('key: get store module')
export const STORE_MODULE_KEY = Symbol('key: get store module key')

const FUNC_MARK_KEY = Symbol('function mark')
const HANDLES_KEY = Symbol('handles key')

export function createStore<T extends object>(originStore: T): T {
  const handler = {
    has(target: T, key: string) {
      return key in target
    },
    get(target: T, key: string) {
      return target[key]
    },
    set(target: T, key: string, value: any) {
      target[key] = value
      const listeners: Set<Function> = target[key][HANDLES_KEY].get(key)
      listeners.forEach(func => func[FUNC_MARK_KEY].has(key) && func(value))
      return true
    },
  }

  const proxy = new Proxy(originStore, handler)
  const keys = Object.keys(originStore)
  keys.forEach(key => {
    const storeModule = originStore[key]
    storeModule[STORE_MODULE] = storeModule
    storeModule[STORE_MODULE_KEY] = key
    storeModule[HANDLES_KEY] = new Map([[key, new Set<Function>()]])
    proxy[key] = storeModule
  })

  return proxy
}

type StoreModule = object

const updaterSet = new Set<Function>()
export function updateStore(storeModule: StoreModule, value: Partial<StoreModule>) {
  if (!updaterSet.size) {
    // delayed execution callback after updating store
    queueMicrotask(() => {
      updaterSet.forEach(func => func(value))
      updaterSet.clear()
    })
  }
  const storeKey = storeModule[STORE_MODULE_KEY]
  if (!storeKey) throw new Error('Parameter error')
  Object.assign(storeModule[STORE_MODULE], value) // Equivalent set store[key]
  const listeners: Set<Function> = storeModule[HANDLES_KEY].get(storeKey)
  listeners.forEach(func => {
    if (func[FUNC_MARK_KEY].has(storeKey)) {
      updaterSet.add(func)
    }
  })
}

export function connect(storeModule: StoreModule, func: Function) {
  const storeKey = storeModule[STORE_MODULE_KEY]
  if (!storeKey) throw new Error('Parameter error')
  const listeners = storeModule[HANDLES_KEY].get(storeKey)
  if (!func[FUNC_MARK_KEY]) func[FUNC_MARK_KEY] = new Set()
  func[FUNC_MARK_KEY].add(storeKey)
  listeners.add(func)
}

export function disconnect(storeModule: StoreModule, func: Function) {
  const storeKey = storeModule[STORE_MODULE_KEY]
  if (!storeKey) throw new Error('Parameter error')
  const listeners = storeModule[HANDLES_KEY].get(storeKey)
  listeners.delete(func)
}
