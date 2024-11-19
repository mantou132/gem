// @ts-nocheck
import { GemElement, html } from "@mantou/gem";
import "@mantou/gem/elements/link"
import "duoyun-ui/elements/use"
export class MyElement extends GemElement {
    render() {
        return html`
      <dy-use></dy-use>
      ${html`<gem-link></gem-link>`}
    `;
    }
}