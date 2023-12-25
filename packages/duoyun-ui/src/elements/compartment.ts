import { adoptedStyle, customElement, property } from '@mantou/gem/lib/decorators';
import { GemElement, html, TemplateResult } from '@mantou/gem/lib/element';

import { contentsContainer } from '../lib/styles';

/**
 * @customElement dy-compartment
 */
@customElement('dy-compartment')
@adoptedStyle(contentsContainer)
export class DuoyunCompartmentElement extends GemElement {
  @property content?: string | number | TemplateResult;
  render = () => {
    return html`${this.content}`;
  };
}
