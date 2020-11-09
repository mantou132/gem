import { updateStore } from './lib/store';

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
  Object.assign<DevToolsHook, DevToolsHook>(window.__GEM_DEVTOOLS__HOOK__, {
    updateStore,
  });
}

export * from './lib/store';
export * from './lib/history';
export * from './lib/element';
export * from './lib/decorators';
export * from './lib/utils';
