import { updateStore } from './lib/store';
import * as Gem from './';

export interface DevToolsHook {
  updateStore: typeof updateStore;
}

declare global {
  interface Window {
    __GEM_DEVTOOLS__HOOK__?: DevToolsHook;
  }
}

if (window.__GEM_DEVTOOLS__HOOK__) {
  // 不支持多个 gem
  Object.assign(window.__GEM_DEVTOOLS__HOOK__, { ...Gem });
}

export * from './lib/store';
export * from './lib/history';
export * from './lib/element';
export * from './lib/decorators';
export * from './lib/utils';

export * from './lib/version';
