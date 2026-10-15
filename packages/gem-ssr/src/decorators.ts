import type { GemElement } from '@mantou/gem';
import { isServer } from '@mantou/gem/lib/server';

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

/**
 * 服务端渲染时执行并等待完成，执行后的状态会输出到页面中（只支持 JSON 值）
 *
 * 客户端什么时候执行由其他装饰器决定，例如 `@mounted()`、`@effect()`，
 * 恢复了 SSR 状态的元素会跳过首轮副作用中的执行
 *
 * @example
 * ```ts
 * @server()
 * @mounted()
 * #init = async () => this.#state({ list: await fetchList() });
 * ```
 */
export function server<T extends GemElement, V extends (...args: any[]) => any>() {
  return (value: V | undefined, context: ClassFieldDecoratorContext<T, V> | ClassMethodDecoratorContext<T, V>): any => {
    context.addInitializer(function (this: T) {
      if (!isServer) return;
      const fn = async () => context.access.get.call(this, this).call(this);
      ssrContext.tasks.set(this, [...(ssrContext.tasks.get(this) || []), fn]);
    });
    const wrap = (fn: V) =>
      function (this: T, ...args: Parameters<V>) {
        // 状态已经由服务端执行后的结果恢复
        if (!isServer && ssrContext.restoredElements.has(this)) return;
        return fn.apply(this, args);
      };
    return context.kind === 'method' ? wrap(value!) : wrap;
  };
}
