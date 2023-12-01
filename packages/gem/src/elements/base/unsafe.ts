import { GemElement } from '../../lib/element';
import { attribute } from '../../lib/decorators';

/**
 * 直接写会被解释成固定属性，需要使用变量赋值
 *
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
