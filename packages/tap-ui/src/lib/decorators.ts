// biome-ignore-all lint/plugin/no_this_effect: 定义装饰器

import type { GemElement } from '@mantou/gem/lib/element';
import { connect, createStore } from '@mantou/gem/lib/store';

import { closestElement } from './element';

export function visible<T extends GemElement, V extends () => any>() {
  return (_: any, { addInitializer, access }: ClassFieldDecoratorContext<T, V> | ClassMethodDecoratorContext<T, V>) => {
    addInitializer(function () {
      this.effect(
        () => {
          const fn = access.get.call(this, this).bind(this);
          const handler = () => {
            if (document.visibilityState === 'visible') fn();
          };
          document.addEventListener('visibilitychange', handler);
          return () => document.removeEventListener('visibilitychange', handler);
        },
        () => [],
      );
    });
  };
}

/**
 * 暂停子孙元素 `@activeEffect` 的容器（例如 `<tap-stack>` 中不在栈顶的页面）设置 `data-inactive` 属性，
 * 切换后更新它，让 `@activeEffect` 重新检查元素是否活动
 *
 * 不使用 `inert`：模态框后面的内容不可交互但仍然可见，不应该暂停
 */
export const activityStore = createStore({});

/** 元素不在 `data-inactive` 的子树中，跨越 ShadowDOM 和 reflect */
export const isActiveElement = (ele: Element) => !closestElement(ele, '[data-inactive]');

/**
 * 和 `@effect` 一样，但只在元素活动（见 `isActiveElement`）时执行，例如不在栈顶的页面中不请求数据；
 * 不活动时执行清理函数，再次活动时和首次执行一样（没有 `oldDeps`），元素的状态保留
 *
 * @example
 * ```ts
 * @activeEffect((i) => [i.id])
 * #fetch = ([id]) => {
 *   const ctrl = new AbortController();
 *   fetchDetail(id, ctrl.signal);
 *   return () => ctrl.abort();
 * };
 * ```
 */
export function activeEffect<T extends GemElement, K extends any[] = any[]>(getDep?: (instance: T) => K) {
  return (
    _: any,
    {
      addInitializer,
      access,
    }:
      | ClassFieldDecoratorContext<T, (deps: K, oldDeps?: K) => any>
      | ClassMethodDecoratorContext<T, (deps: K, oldDeps?: K) => any>,
  ) => {
    addInitializer(function (this: T) {
      const callback = access.get.call(this, this).bind(this);
      let active = false;
      // 只更新活动状态改变的元素
      this.effect(
        () => connect(activityStore, () => isActiveElement(this) !== active && this.update()),
        () => [],
      );
      this.effect(
        ([isActive, ...deps]: any[], old?: any[]) => {
          active = isActive;
          if (isActive) return callback(deps as K, old?.[0] ? (old.slice(1) as K) : undefined);
        },
        // 没有依赖时和 `@effect()` 一样每次更新都执行
        () => [isActiveElement(this), ...(getDep ? getDep(this) : [Symbol()])],
      );
    });
  };
}
