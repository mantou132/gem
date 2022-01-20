import { GemElement } from '../lib/element';
import { attribute, customElement } from '../lib/decorators';

/**
 * 直接写会被解释成固定属性，需要使用变量赋值
 *
 * @customElement gem-unsafe
 * @attr content
 * @attr contentcss
 */
@customElement('gem-unsafe')
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
              :host {
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
