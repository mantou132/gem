// @ts-nocheck
import { html, GemElement } from "@mantou/gem";
import "@mantou/gem/elements/link";
import "duoyun-ui/elements/use";
import "duoyun-ui/patterns/console";
export class MyElement extends GemElement {
    render() {
        return html`
      <dy-use></dy-use>
      <dy-use></dy-use>
      <dy-pat-console></dy-pat-console>
      ${html`<gem-link></gem-link>`}
    `;
    }
}