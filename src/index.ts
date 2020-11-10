import { updateStore } from './lib/store';
import { version } from './manifest.json';

export interface DevToolsHook {
  version: string;
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
    version,
    updateStore,
  });
}

export * from './lib/store';
export * from './lib/history';
export * from './lib/element';
export * from './lib/decorators';
export * from './lib/utils';

export { version } from './manifest.json';
