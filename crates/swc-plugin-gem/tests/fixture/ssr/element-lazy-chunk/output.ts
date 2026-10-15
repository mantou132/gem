// @ts-nocheck
import { customElement, GemElement, html, template } from '@mantou/gem';
import { server } from '@mantou/gemkit';
@customElement('app-counter')
@server({
    lazy: true
})
export class AppCounterElement extends GemElement {
    @template()
    #content = ()=>html`<button>0</button>`;
}
