import { html, render } from './lit-html';
import { setEngine } from './reactive';
import * as reactiveExports from './reactive';
import * as decoratorsExports from './decorators';
import * as storeExports from './store';
import * as versionExports from './version';

setEngine(html, render);

export * from './reactive';
export * from './decorators';

export { directive } from './directive';
export { repeat } from './repeat';
export { svg, mathml, TemplateResult, createRef } from './lit-html';

declare global {
  interface Window {
    __GEM_DEVTOOLS__HOOK__?:
      | (typeof reactiveExports & typeof decoratorsExports & typeof storeExports & typeof versionExports)
      | Record<string, never>;
  }
}

// 只记录第一次定义，往往是最外层 App
if (window.__GEM_DEVTOOLS__HOOK__ && !window.__GEM_DEVTOOLS__HOOK__.GemElement) {
  Object.assign(window.__GEM_DEVTOOLS__HOOK__, {
    ...reactiveExports,
    ...decoratorsExports,
    ...storeExports,
    ...versionExports,
  });
}
