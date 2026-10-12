import type { Store } from '@mantou/gem';

export const STORES_SCRIPT_ID = 'gem-ssr-stores';

/**
 * 读取服务端渲染时的 store 值，key 需要和 `render` 的 `stores` 选项一致
 *
 * 应该在创建 store 后立即调用，确保在元素渲染之前完成
 */
export function hydrateStores(stores: Record<string, Store<any>>) {
  const script = document.getElementById(STORES_SCRIPT_ID);
  if (!script) return;
  const data = JSON.parse(script.textContent!);
  for (const [key, store] of Object.entries(stores)) {
    if (key in data) store(data[key]);
  }
}
