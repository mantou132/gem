// @ts-nocheck
import { css, adoptedStyle, customElement, attribute, emitter, template, html, styleMap } from "@mantou/gem";
import { name as alias } from "test";
import { render, Emitter, GemElement } from '@mantou/gem';
const style = css``;
@adoptedStyle(style)
@customElement('my-element')
class MyElement extends GemElement {
    @attribute
    name: string;
    @emitter
    open: Emitter<null>;
    @template()
    render() {
        return html`<div style=${styleMap({})}></div>`;
    }
}
class MyElement1 extends (_GemElement = GemElement) {}
alias();