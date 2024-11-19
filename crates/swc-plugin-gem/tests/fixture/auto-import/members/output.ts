// @ts-nocheck
import { adoptedStyle, attribute, css, customElement, emitter, html, styleMap, template } from "@mantou/gem";
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