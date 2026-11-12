import { html, render } from './lit-html';
import { createState, css, GemElement, setEngine } from './reactive';
import { version } from './version';

// 副作用，在 package.json 的 `sideEffects` 中声明；
// 同时声明 `index.js`，否则 esbuild 从入口直接解析到 reactive 的导出时会跳过这个模块
setEngine(html, render);

export * from './decorators';
export { directive } from './directive';
export { keyed } from './keyed';
export { createRef, mathml, svg, TemplateResult } from './lit-html';
export * from './reactive';
export { repeat } from './repeat';

// 只提供 devtools 使用的成员，引用整个模块会导致没用到的导出不能被树抖
const hookExports = { GemElement, setEngine, html, render, css, createState, version };

type HookExports = typeof hookExports;

declare global {
  /** devtools 注入的钩子，其他包可以扩展，例如 gem-ssr */
  interface GemDevToolsHook extends HookExports {}
  var __GEM_DEVTOOLS__HOOK__: GemDevToolsHook | Record<string, never> | undefined;
}

// 只记录第一次定义，往往是最外层 App
if (globalThis.__GEM_DEVTOOLS__HOOK__ && !globalThis.__GEM_DEVTOOLS__HOOK__.GemElement) {
  Object.assign(globalThis.__GEM_DEVTOOLS__HOOK__, hookExports);
}
