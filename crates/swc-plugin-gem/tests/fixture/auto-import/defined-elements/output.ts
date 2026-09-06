// @ts-nocheck
import { customElement, html, GemElement } from "@mantou/gem";
import "duoyun-ui/elements/use";
@customElement('dy-foo')
export class DyFoo extends GemElement {
    render() {
        return html`
      <dy-foo></dy-foo>
      <dy-bar></dy-bar>
      <dy-use></dy-use>
    `;
    }
}
@customElement('dy-bar')
export class DyBar extends GemElement {
}
