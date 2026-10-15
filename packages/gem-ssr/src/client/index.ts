import { _setStoreRestorer, type GemElement, setHydrationEngine } from '@mantou/gem';

import { STORES_SCRIPT_ID } from '../constants';
import { SSR_STATE, ssrContext } from '../decorators';
import { hydrateContainer } from './hydration';

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

setHydrationEngine(hydrateContainer, restoreState);

let stores: Record<string, object> | undefined;

// 创建有 key 的 store 时使用服务端的值，需要在创建 store 之前导入
_setStoreRestorer((key) => {
  if (!stores) {
    const script = document.getElementById(STORES_SCRIPT_ID);
    if (!script) return;
    stores = JSON.parse(script.textContent!) as Record<string, object>;
  }
  return stores[key];
});
