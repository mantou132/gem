// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
if (typeof window === 'undefined') {
  const getAny = () => {
    const anonymous = () => getAny();
    Object.defineProperties(anonymous, {
      length: { writable: true },
      name: { writable: true },
    });
    return new Proxy(anonymous, {
      get(target, key) {
        if (key === Symbol.toPrimitive) return () => '';
        return target[key] || (target[key] = getAny());
      },
    });
  };
  const any = getAny();

  globalThis.document = any;
  globalThis.addEventListener = any;
  globalThis.history = any;
  globalThis.navigator = any;
  globalThis.customElements = any;
  globalThis.HTMLElement = null;
  globalThis.location = new URL('about:blank');
  globalThis.window = globalThis;
}

export {};
