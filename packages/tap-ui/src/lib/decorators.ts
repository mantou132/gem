// biome-ignore-all lint/plugin/no_this_effect: 定义装饰器

import type { GemElement } from '@mantou/gem/lib/element';

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
