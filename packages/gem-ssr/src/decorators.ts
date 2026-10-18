import type { GemElement } from '@mantou/gem';
import { isServer } from '@mantou/gem/lib/server';

import type { LazyOptions } from './client/lazy';
import { hash } from './hash';

// 客户端构建时 `@server()` `@lazy()` 标记的元素类被改写后使用，从导入 `server` 或 `lazy` 的模块导入
export { defineLazy, type LazyOptions } from './client/lazy';
export { GemServerElement, waitServerElements } from './client/server-element';

// SSR 输出的元素状态，值是 `internals.stateList` 的 JSON
export const SSR_STATE = 'ssr-state';

// 服务端和客户端共享
export const ssrContext = {
  // 渲染期间等待执行的服务端方法
  tasks: new WeakMap<GemElement, (() => Promise<unknown>)[]>(),
  // 执行过服务端方法的元素，需要输出状态
  stateElements: new WeakSet<GemElement>(),
  // 刚恢复了 SSR 状态的元素，首轮副作用执行完后移除
  restoredElements: new WeakSet<GemElement>(),
};

/** `server`：纯服务端元素，`lazy`：延时视图 */
export type ServerElementKind = 'server' | 'lazy';

const SERVER_ELEMENT = Symbol('gem-ssr-server-element');

/** `@server()` 或 `@lazy()` 标记的元素类的类型，没有标记时返回 `undefined` */
export function getServerElementKind(cls: object): ServerElementKind | undefined {
  return (cls as any)[Symbol.metadata]?.[SERVER_ELEMENT];
}

/**
 * 纯服务端元素的 key，由标签名、attribute 和 property 生成，服务端和客户端一致，
 * 客户端导航时用来获取服务端渲染的 HTML
 */
export function getServerElementKey(tag: string, attrs: Record<string, string>, props: Record<string, unknown>) {
  const sort = (obj: object) => Object.entries(obj).sort(([a], [b]) => (a < b ? -1 : 1));
  return `${tag}:${hash(JSON.stringify([sort(attrs), sort(props)]))}`;
}

type MemberContext<T, V extends (this: T, ...args: any) => any> =
  | ClassFieldDecoratorContext<T, V>
  | ClassMethodDecoratorContext<T, V>;

/**
 * 用在方法或字段上：服务端渲染时执行并等待完成，执行后的状态会输出到页面中（只支持 JSON 值）
 *
 * 客户端什么时候执行由其他装饰器决定，例如 `@mounted()`、`@effect()`，
 * 恢复了 SSR 状态的元素会跳过首轮副作用中的执行
 *
 * 用在元素类上：纯服务端元素，只输出 HTML，客户端不加载元素代码，也不水合，
 * 可以使用只在服务端运行的代码（例如 `node:fs`）。
 * 需要 `unplugin-gem`（或 `swc-plugin-gem`）的 `ssr` 选项在客户端构建时改写元素模块
 *
 * @example
 * ```ts
 * @server()
 * @mounted()
 * #init = async () => this.#state({ list: await fetchList() });
 * ```
 */
type ServerDecorator = {
  <T extends GemElement, V extends (this: T, ...args: any[]) => any>(
    value: V | undefined,
    context: MemberContext<T, V>,
  ): any;
  (value: abstract new (...args: any[]) => GemElement, context: ClassDecoratorContext): void;
};

export function server(): ServerDecorator {
  return (value: any, context: MemberContext<GemElement, any> | ClassDecoratorContext): any => {
    if (context.kind === 'class') {
      context.metadata[SERVER_ELEMENT] = 'server' satisfies ServerElementKind;
      return;
    }
    context.addInitializer(function (this: GemElement) {
      if (!isServer) return;
      const fn = async () => context.access.get.call(this, this).call(this);
      ssrContext.tasks.set(this, [...(ssrContext.tasks.get(this) || []), fn]);
    });
    const wrap = (fn: (...args: any[]) => any) =>
      function (this: GemElement, ...args: any[]) {
        // 状态已经由服务端执行后的结果恢复
        if (!isServer && ssrContext.restoredElements.has(this)) return;
        return fn.apply(this, args);
      };
    return context.kind === 'method' ? wrap(value) : wrap;
  };
}

/**
 * 延时视图：服务端渲染，客户端按 `on` 选项（默认用户交互时）才加载元素代码并水合，
 * 客户端创建时先从服务端获取 HTML
 *
 * 元素代码会打包到客户端（单独的 chunk），只能使用同构的代码，
 * 需要 `unplugin-gem`（或 `swc-plugin-gem`）的 `ssr` 选项在客户端构建时改写元素模块，
 * 改写后的模块需要知道 `options`，所以只能是字面量
 *
 * @example
 * ```ts
 * @customElement('app-like-button')
 * @lazy({ on: 'visible' })
 * class AppLikeButtonElement extends GemElement {}
 * ```
 */
export function lazy(_options?: LazyOptions) {
  return (_value: abstract new (...args: any[]) => GemElement, context: ClassDecoratorContext) => {
    context.metadata[SERVER_ELEMENT] = 'lazy' satisfies ServerElementKind;
  };
}
