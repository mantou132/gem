import { attribute, shadow, template } from '../../lib/decorators';
import { GemElement } from '../../lib/reactive';

@shadow()
export class GemUnsafeElement extends GemElement {
  @attribute content: string;
  @attribute contentcss: string;

  @template()
  #content = () => {
    const style = /*html*/ `
      <style>
        :host(:where(:not([hidden]))) {
          display: contents;
        }
        ${this.contentcss}
      </style>
    `;

    this.shadowRoot!.innerHTML = this.content + style.trim();

    // 不要更新内容
    return undefined;
  };
}
