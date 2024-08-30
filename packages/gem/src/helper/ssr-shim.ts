// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
if (typeof window === 'undefined') {
  const getAny = () => {
    // constructable
    function anonymous() {
      return getAny();
    }
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

  globalThis.window = globalThis;
  globalThis.location = new URL('about:blank');
  globalThis.HTMLElement = null;

  globalThis.document = any;
  globalThis.addEventListener = any;
  globalThis.history = any;
  globalThis.customElements = any;

  // duoyun-ui
  globalThis.CSSStyleSheet = any;
  globalThis.Document = any;
  globalThis.Element = any;
  globalThis.MutationObserver = any;

  try {
    // gem dist i18n
    // https://nodejs.org/api/globals.html#navigator_1
    globalThis.navigator = any;
  } catch {
    //
  }
}

export {};
