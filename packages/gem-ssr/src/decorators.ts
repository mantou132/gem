import type { GemElement } from '@mantou/gem';

// SSR 输出的元素状态，值是 `internals.stateList` 的 JSON
export const SSR_STATE = 'ssr-state';

// 服务端和客户端共享，服务端渲染器导入时设置 `isServer`
export const ssrContext = {
  isServer: false,
  // 渲染期间等待执行的服务端方法
  tasks: new Map<GemElement, (() => Promise<unknown>)[]>(),
  // 执行过服务端方法的元素，需要输出状态
  stateElements: new Set<GemElement>(),
  // 已经恢复了 SSR 状态的元素
  restoredElements: new WeakSet<GemElement>(),
};

/**
 * 服务端渲染时执行并等待完成，执行后的状态会输出到页面中（只支持 JSON 值）
 *
 * 客户端恢复了 SSR 状态时不再执行，否则在挂载时执行，和 `@mounted()` 一样
 */
export function server<T extends GemElement, V extends () => any>() {
  return (_: any, { addInitializer, access }: ClassFieldDecoratorContext<T, V> | ClassMethodDecoratorContext<T, V>) => {
    addInitializer(function (this: T) {
      const fn = async () => access.get.call(this, this).call(this);
      if (ssrContext.isServer) {
        ssrContext.tasks.set(this, [...(ssrContext.tasks.get(this) || []), fn]);
      } else {
        this.effect(
          () => void (ssrContext.restoredElements.has(this) || fn()),
          () => [],
        );
      }
    });
  };
}
