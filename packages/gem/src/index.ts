/**
 * 不支持多个 gem
 */
import * as Gem from './';

declare global {
  interface Window {
    __GEM_DEVTOOLS__HOOK__?: typeof Gem | Record<string, never>;
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
