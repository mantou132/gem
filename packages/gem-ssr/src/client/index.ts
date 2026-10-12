import { type GemElement, setHydrationEngine } from '@mantou/gem';

import { SSR_STATE, ssrContext } from '../decorators';
import { hydrateContainer } from './hydration';

export { hydrateStores } from './store';

function restoreState(ele: GemElement) {
  const value = ele.getAttribute(SSR_STATE);
  if (value === null) return;
  ele.removeAttribute(SSR_STATE);
  const { stateList } = ele.internals;
  JSON.parse(value).forEach((state: object, index: number) => Object.assign(stateList[index], state));
  ssrContext.restoredElements.add(ele);
}

setHydrationEngine(hydrateContainer, restoreState);
