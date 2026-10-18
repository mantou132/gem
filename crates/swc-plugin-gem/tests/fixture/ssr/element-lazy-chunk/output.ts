// @ts-nocheck
import { customElement, GemElement, html, template } from '@mantou/gem';
import { lazy } from '@mantou/gemkit';
@customElement('app-counter')
@lazy()
export class AppCounterElement extends GemElement {
    @template()
    #content = ()=>html`<button>0</button>`;
}
