/**
 * 不支持多个 gem
 */
import * as Gem from './';

export type DevToolsHook = typeof Gem;
declare global {
  interface Window {
    __GEM_DEVTOOLS__HOOK__?: DevToolsHook;
  }
}

if (window.__GEM_DEVTOOLS__HOOK__) {
  Object.assign(window.__GEM_DEVTOOLS__HOOK__, { ...Gem });
}

export * from './lib/store';
export * from './lib/history';
export * from './lib/element';
export * from './lib/decorators';
export * from './lib/utils';

export * from './lib/version';
