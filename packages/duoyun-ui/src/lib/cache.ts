import { LinkedList } from '@mantou/gem/lib/utils';

interface CacheOptions {
  max?: number;
  maxAge?: number;
  renewal?: boolean;
}

interface CacheItem<T> {
  timestamp: number;
  value: T;
}

/**
 * 过期的不能自动清理，但超出最大容量时会被修剪
 */
export class Cache<T = any> {
  #max: number;
  #maxAge: number;
  #renewal: boolean;

  #map = new Map<string, CacheItem<T>>();
  #reverseMap = new Map<T, string>();
  #addedLinked = new LinkedList<T>();

  constructor({ max = Infinity, maxAge = Infinity, renewal = false }: CacheOptions = {}) {
    this.#max = max;
    this.#maxAge = maxAge;
    this.#renewal = renewal;
  }

  setOptions(options: CacheOptions) {
    this.#max = options.max ?? this.#max;
    this.#maxAge = options.maxAge ?? this.#maxAge;
    this.#renewal = options.renewal ?? this.#renewal;
  }

  #trim() {
    for (let i = this.#addedLinked.size - this.#max; i > 0; i--) {
      const value = this.#addedLinked.get()!;
      const key = this.#reverseMap.get(value)!;
      this.#reverseMap.delete(value);
      this.#map.delete(key);
    }
  }

  set(key: string, value: T) {
    this.#addedLinked.add(value);
    this.#reverseMap.set(value, key);
    this.#map.set(key, { value, timestamp: Date.now() });
    this.#trim();
    return value;
  }

  get(key: string): T | undefined;
  get(key: string, init: (key: string) => T): T;
  get(key: string, init?: (key: string) => T) {
    const cache = this.#map.get(key);
    if (!cache) {
      return init && this.set(key, init(key));
    }
    const { timestamp, value } = cache;
    // 过期重新生成
    if (Date.now() - timestamp > this.#maxAge) {
      this.#addedLinked.delete(value);
      this.#reverseMap.delete(value);
      this.#map.delete(key);
      return init && this.set(key, init(key));
    }
    if (this.#renewal) {
      cache.timestamp = Date.now();
    }
    // 调整下位置
    this.#addedLinked.add(value);
    return value;
  }

  clear() {
    this.#map.clear();
    this.#reverseMap.clear();
    this.#addedLinked.clear();
  }
}
