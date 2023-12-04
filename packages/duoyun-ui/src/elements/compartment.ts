import { adoptedStyle, customElement, property } from '@mantou/gem/lib/decorators';
import { GemElement, html, TemplateResult } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    display: contents;
  }
`);

/**
 * @customElement dy-compartment
 */
@customElement('dy-compartment')
@adoptedStyle(style)
export class DuoyunCompartmentElement extends GemElement {
  @property content?: string | number | TemplateResult;
  render = () => {
    return html`${this.content}`;
  };
}
