import type { SSRStatus } from '../store';

declare function inspect(arg: any): void;
declare let $0: any;

// 不要使用作用域外的变量
export const getSelectedSSR = (): SSRStatus | null => {
  const hook = window.__GEM_DEVTOOLS__HOOK__;
  if (!hook?.ssr || !($0 instanceof Element)) return null;
  const { hydrated, GemServerElement, lazyElements, loading } = hook.ssr;
  const tag = $0.localName;
  const lazy = lazyElements.get(tag);
  const defined = !!customElements.get(tag);
  const status: SSRStatus = { render: '', mismatches: [] };
  if (lazy) {
    status.lazy = `on: ${lazy.on}, ${defined ? 'loaded' : loading.has(tag) ? 'loading' : 'not loaded'}`;
  }
  const mismatches = hydrated.get($0.shadowRoot!) || hydrated.get($0);
  if ($0 instanceof GemServerElement) {
    status.render = 'Server only, no JS';
  } else if (lazy && !defined) {
    status.render = 'Server rendered, waiting for JS';
  } else if (mismatches) {
    status.render = mismatches.length ? `Hydrated, ${mismatches.length} part(s) re-rendered on client` : 'Hydrated';
    status.mismatches = mismatches.map(({ reason, template }) => ({ reason, template }));
  } else if (hook.GemElement && $0 instanceof hook.GemElement) {
    status.render = 'Client rendered';
  } else {
    return null;
  }
  return status;
};

export const inspectMismatch = (index: number) => {
  const { hydrated } = window.__GEM_DEVTOOLS__HOOK__!.ssr!;
  const node = (hydrated.get($0.shadowRoot) || hydrated.get($0))![index].node;
  inspect(node instanceof ShadowRoot ? node.host : node);
};
