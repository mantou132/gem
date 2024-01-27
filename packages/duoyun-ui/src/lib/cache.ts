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

export class Cache<T = any> {
  #max: number;
  #maxAge: number;
  #renewal: boolean;

  #map = new Map<string, CacheItem<T>>();
  #reverseMap = new Map<T, string>();
  #linkedList = new LinkedList<T>();

  constructor({ max = Infinity, maxAge = Infinity, renewal = false }: CacheOptions = {}) {
    this.#max = max;
    this.#maxAge = maxAge;
    this.#renewal = renewal;
  }

  #trim() {
    for (let i = this.#linkedList.size - this.#max; i > 0; i--) {
      const value = this.#linkedList.get();
      const key = this.#reverseMap.get(value!)!;
      this.#reverseMap.delete(value!);
      this.#map.delete(key);
    }
  }

  set(key: string, value: T) {
    this.#linkedList.add(value);
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
    if (Date.now() - timestamp > this.#maxAge) {
      this.#linkedList.delete(value);
      this.#reverseMap.delete(value);
      this.#map.delete(key);
      return init && this.set(key, init(key));
    }
    if (this.#renewal) {
      cache.timestamp = Date.now();
    }
    this.#linkedList.get();
    this.#linkedList.add(value);
    return value;
  }
}
