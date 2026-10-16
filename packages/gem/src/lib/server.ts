// SSR 相关的功能都在这里
//
// `@mantou/gem-ssr` 在加载 Gem 前提供 `__GEM_SSR__`，返回当前请求的作用域，
// 客户端构建时 `unplugin-gem` 把 `globalThis.__GEM_SSR__` 替换成 `undefined`，SSR 代码会被压缩移除

import type { GemElement } from './reactive';

const { get, set, has, deleteProperty, defineProperty, getOwnPropertyDescriptor, ownKeys } = Reflect;

const getRequestScope: (() => WeakMap<object, any> | undefined) | undefined = (globalThis as any).__GEM_SSR__;

/** 服务端渲染时不执行副作用，同步更新 */
export const isServer = !!getRequestScope;

/** SSR 接入 Gem 的钩子，`@mantou/gem-ssr` 在服务端和客户端分别设置 */
export const ssrHooks: {
  /** 渲染元素内容，返回 `true` 时跳过渲染：服务端收集模版，客户端水合 */
  render?: (value: unknown, container: HTMLElement | DocumentFragment) => boolean;
  /** 元素挂载前调用，返回 `true` 时推迟挂载，之后调用 `connect` 挂载：客户端恢复状态，等待父模版水合 */
  connect?: (ele: GemElement, connect: () => void) => boolean;
  /** 创建有 key 的 store，返回初始值：客户端恢复服务端的值 */
  createStore?: (key: string) => object | undefined;
  /** 更新有 key 的 store：服务端记录，渲染后输出到页面中 */
  updateStore?: (key: string, store: object) => void;
} = {};

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
