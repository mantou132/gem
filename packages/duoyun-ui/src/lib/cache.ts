import { LinkedList } from '@mantou/gem/lib/utils';

interface CacheOptions {
  max?: number;
  maxAge?: number;
}

interface CacheItem<T> {
  timestamp: number;
  value: T;
}

export class Cache<T = any> {
  #max: number;
  #maxAge: number;

  #map = new Map<string, CacheItem<T>>();
  #reverseMap = new Map<T, string>();
  #linkedList = new LinkedList<T>();

  constructor({ max = Infinity, maxAge = Infinity }: CacheOptions = {}) {
    this.#max = max;
    this.#maxAge = maxAge;
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
  }

  get(key: string, callback?: (result: T) => void) {
    const cache = this.#map.get(key);
    if (!cache) return;
    const { timestamp, value } = cache;
    if (Date.now() - timestamp > this.#maxAge) {
      this.#linkedList.delete(value);
      this.#reverseMap.delete(value);
      this.#map.delete(key);
      return;
    }
    this.#linkedList.get();
    this.#linkedList.add(value);
    callback?.(value);
    return value;
  }
}
