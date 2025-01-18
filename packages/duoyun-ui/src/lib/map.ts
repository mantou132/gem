export class StringWeakMap<T extends WeakKey> {
  #map = new Map<string, WeakRef<T>>();
  #weakMap = new WeakMap<T, string>();
  #registry = new FinalizationRegistry<string>((key) => this.#map.delete(key));

  set(key: string, val: T) {
    this.#map.set(key, new WeakRef(val));
    this.#weakMap.set(val, key);
    this.#registry.register(val, key);
  }

  get(key: string) {
    return this.#map.get(key)?.deref();
  }

  findKey(val: T) {
    return this.#weakMap.get(val);
  }

  *[Symbol.iterator]() {
    const entries = this.#map.entries();
    for (const [tag, ref] of entries) {
      yield [tag, ref.deref()!] as const;
    }
  }
}
