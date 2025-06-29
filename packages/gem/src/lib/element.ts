import * as decoratorsExports from './decorators';
import { html, render } from './lit-html';
import * as reactiveExports from './reactive';
import { setEngine } from './reactive';
import * as storeExports from './store';
import * as versionExports from './version';

setEngine(html, render);

export * from './decorators';
export { directive } from './directive';
export { createRef, mathml, svg, TemplateResult } from './lit-html';
export * from './reactive';
export { repeat } from './repeat';

declare global {
  var __GEM_DEVTOOLS__HOOK__:
    | (typeof reactiveExports & typeof decoratorsExports & typeof storeExports & typeof versionExports)
    | Record<string, never>
    | undefined;
}

// 只记录第一次定义，往往是最外层 App
if (globalThis.__GEM_DEVTOOLS__HOOK__ && !globalThis.__GEM_DEVTOOLS__HOOK__.GemElement) {
  Object.assign(globalThis.__GEM_DEVTOOLS__HOOK__, {
    ...reactiveExports,
    ...decoratorsExports,
    ...storeExports,
    ...versionExports,
  });
}
