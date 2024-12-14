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
globalThis.chrome = globalThis.browser = new Proxy(
  {},
  {
    get() {
      return getAny();
    },
  },
);
