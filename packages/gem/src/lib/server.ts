// SSR 相关的功能都在这里
//
// `@mantou/gem-ssr` 在加载 Gem 前提供 `__GEM_SSR__`，返回当前请求的作用域，
// 客户端构建时 `unplugin-gem` 把 `globalThis.__GEM_SSR__` 替换成 `undefined`，SSR 代码会被压缩移除

const { get, set, has, deleteProperty, defineProperty, getOwnPropertyDescriptor, ownKeys } = Reflect;

const getRequestScope: (() => WeakMap<object, any> | undefined) | undefined = (globalThis as any).__GEM_SSR__;

/** 服务端渲染时不执行副作用，同步更新 */
export const isServer = !!getRequestScope;

/**
 * SSR 时返回当前请求中 `key` 对应的值，第一次访问时使用 `init` 创建，
 * 不在请求中（包括客户端）时返回 `key` 本身
 */
export const getRequestValue: <T extends object>(key: T, init: () => T) => T = getRequestScope
  ? (key, init) => {
      const scope = getRequestScope();
      if (!scope) return key;
      if (!scope.has(key)) scope.set(key, init());
      return scope.get(key);
    }
  : (key) => key;

/**
 * SSR 时对象的读写转到当前请求的副本上，副本在第一次访问时从原对象浅复制
 *
 * 嵌套的对象没有复制，原地修改会影响所有请求，应该替换顶层属性，例如 `store({ list: [...store.list, item] })`
 */
export const isolate: <T extends object>(target: T) => T = getRequestScope
  ? (target) => {
      const copy = () => ({ ...target });
      const current = () => getRequestValue(target, copy);
      return new Proxy(target, {
        get: (_, key) => get(current(), key),
        set: (_, key, value) => set(current(), key, value),
        has: (_, key) => has(current(), key),
        deleteProperty: (_, key) => deleteProperty(current(), key),
        defineProperty: (_, key, descriptor) => defineProperty(current(), key, descriptor),
        getOwnPropertyDescriptor: (_, key) => getOwnPropertyDescriptor(current(), key),
        ownKeys: () => ownKeys(current()),
      });
    }
  : (target) => target;
