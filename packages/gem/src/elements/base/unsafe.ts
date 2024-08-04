import { GemElement } from '../../lib/element';
import { attribute, shadow } from '../../lib/decorators';
import { raw } from '../../lib/utils';

/**
 * @customElement gem-unsafe
 * @attr content
 * @attr contentcss
 */
@shadow()
export class GemUnsafeElement extends GemElement {
  @attribute content: string;
  @attribute contentcss: string;

  render() {
    this.shadowRoot!.innerHTML = raw`
      <style>
        :host(:where(:not([hidden]))) {
          display: contents;
        }
        ${this.contentcss}
      </style>
      ${this.content}
    `;
    return undefined;
  }
}
