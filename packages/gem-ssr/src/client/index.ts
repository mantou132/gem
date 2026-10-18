import type { GemElement } from '@mantou/gem';
import type { TemplateResult } from '@mantou/gem/lib/lit-html';
import { ssrHooks } from '@mantou/gem/lib/server';

import { SSR_SERVER, STORES_SCRIPT_ID } from '../constants';
import { SSR_STATE, ssrContext } from '../decorators';
import { deferConnect, hydrateContainer } from './hydration';
import { observeLazyRoot } from './lazy';

export { defineLazy } from './lazy';
export { GemServerElement, setServerElementLoader } from './server-element';

function restoreState(ele: GemElement) {
  const value = ele.getAttribute(SSR_STATE);
  if (value === null) return;
  ele.removeAttribute(SSR_STATE);
  const { stateList } = ele.internals;
  JSON.parse(value).forEach((state: object, index: number) => Object.assign(stateList[index], state));
  ssrContext.restoredElements.add(ele);
  // 首轮副作用在渲染后的微任务中执行
  setTimeout(() => ssrContext.restoredElements.delete(ele));
}

ssrHooks.render = (value, container) => {
  // 水合的 ShadowRoot 是解析 HTML 时创建的，需要单独观察其中客户端创建的延时视图元素
  observeLazyRoot(container);
  return hydrateContainer(value as TemplateResult, container);
};

// 推迟挂载的元素在挂载时才恢复状态
ssrHooks.connect = (ele, connect) => {
  // 延时视图元素的服务端内容标记，升级后由元素自己渲染
  ele.removeAttribute(SSR_SERVER);
  if (deferConnect(ele, connect)) return true;
  restoreState(ele);
  return false;
};

let stores: Record<string, object> | undefined;

// 创建有 key 的 store 时使用服务端的值，需要在创建 store 之前导入
ssrHooks.createStore = (key) => {
  if (!stores) {
    const script = document.getElementById(STORES_SCRIPT_ID);
    if (!script) return;
    stores = JSON.parse(script.textContent!) as Record<string, object>;
  }
  return stores[key];
};
