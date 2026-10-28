import { hydrated } from './hydration';
import { lazyElements, loading } from './lazy';
import { GemServerElement } from './server-element';

/** Gem devtools 读取的 SSR 信息 */
export interface SSRDevToolsHook {
  hydrated: typeof hydrated;
  GemServerElement: typeof GemServerElement;
  lazyElements: typeof lazyElements;
  loading: typeof loading;
}

declare global {
  interface GemDevToolsHook {
    ssr?: SSRDevToolsHook;
  }
}

// 只在安装了 devtools 时设置，这时 gem 可能还没有写入导出的 API
const hook = globalThis.__GEM_DEVTOOLS__HOOK__ as GemDevToolsHook | undefined;

if (hook) hook.ssr = { hydrated, GemServerElement, lazyElements, loading };
