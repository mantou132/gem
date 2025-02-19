import { html, render } from './lit-html';
import { setEngine } from './reactive';

setEngine(html, render);

export * from './reactive';

export { directive } from './directive';
export { repeat } from './repeat';
export { svg, mathml, TemplateResult, createRef } from './lit-html';
