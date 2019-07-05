export class Pool<T> {
  currentId = 0
  count = 0
  pool = new Map<number, T>()

  add(item: T) {
    this.pool.set(this.count, item)
    this.count += 1
  }

  get(): T {
    const item = this.pool.get(this.currentId)
    if (item) {
      this.pool.delete(this.currentId)
      this.currentId += 1
    }
    return item
  }
}

enum StorageType {
  LOCALSTORAGE = 'localStorage',
  SESSIONSTORAGE = 'sessionStorage',
}
export class Storage<T> {
  cache = {}
  get(key: string, type: StorageType): T {
    if (!this.cache[type]) this.cache[type] = {}
    if (key in this.cache[type]) return this.cache[type][key]

    let value = window[type].getItem(key)

    if (!value) return undefined
    try {
      const result: T = JSON.parse(value)
      this.cache[type][key] = result
      return result
    } catch (e) {
      window[type].removeItem(key)
    }
  }
  getLocal(key: string): T {
    return this.get(key, StorageType.LOCALSTORAGE)
  }
  getSession(key: string): T {
    return this.get(key, StorageType.SESSIONSTORAGE)
  }
  set(key: string, value: T, type: StorageType) {
    if (!this.cache[type]) this.cache[type] = {}
    this.cache[type][key] = value
    return window[type].setItem(key, JSON.stringify(value))
  }
  setLocal(key: string, value: T) {
    return this.set(key, value, StorageType.LOCALSTORAGE)
  }
  setSession(key: string, value: T) {
    return this.set(key, value, StorageType.SESSIONSTORAGE)
  }
}

export class QueryString extends URLSearchParams {
  constructor(param: any) {
    if (param instanceof QueryString) {
      return param
    }
    if (typeof param === 'string') {
      super(param)
    }
    if (param) {
      super()
      Object.keys(param).forEach(key => {
        this.append(key, param[key])
      })
    }
  }

  concat(param: any) {
    let query: any
    if (typeof param === 'string') {
      query = new URLSearchParams(param)
    } else {
      query = param
    }
    Object.keys(query).forEach(key => {
      this.append(key, query[key])
    })
  }

  toString() {
    const string = super.toString()
    return string ? `?${string}` : ''
  }

  toJSON() {
    return this.toString()
  }
}

// 写 html 文本
export function raw(arr: TemplateStringsArray, ...args: any[]) {
  return arr.reduce((prev, current, index) => prev + (args[index - 1] || '') + current)
}

// 写 css 文本，在 CSSStyleSheet 中使用
export function css(arr: TemplateStringsArray, ...args: any[]) {
  return raw(arr, ...args)
}
