import { GemUnsafeElement } from '@mantou/gem/elements/base/unsafe';
import { customElement, property, shadow, template } from '@mantou/gem/lib/decorators';
import type { TemplateResult } from '@mantou/gem/lib/element';
import { html } from '@mantou/gem/lib/element';

@customElement('dy-compartment')
@shadow()
export class DuoyunCompartmentElement extends GemUnsafeElement {
  @property content?: string | number | TemplateResult | Element | Element[];

  @template()
  #content = () => {
    return html`${this.content}`;
  };
}
