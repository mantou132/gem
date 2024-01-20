import { GemElement } from '../../lib/element';
import { attribute } from '../../lib/decorators';

/**
 * @customElement gem-unsafe
 * @attr content
 * @attr contentcss
 */
export class GemUnsafeElement extends GemElement {
  @attribute content: string;
  @attribute contentcss: string;

  constructor() {
    super();
    this.effect(
      () => {
        if (this.shadowRoot) {
          this.shadowRoot.innerHTML = `
            <style>
              :host(:where(:not([hidden]))) {
                display: contents;
              }
              ${this.contentcss}
            </style>
            ${this.content}
          `;
        }
      },
      () => [this.content, this.contentcss],
    );
  }

  render() {
    return undefined;
  }
}
