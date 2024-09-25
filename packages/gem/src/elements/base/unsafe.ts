import { GemElement } from '../../lib/element';
import { attribute, shadow, template } from '../../lib/decorators';
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

  @template()
  #content = () => {
    this.shadowRoot!.innerHTML = raw`
      <style>
        :host(:where(:not([hidden]))) {
          display: contents;
        }
        ${this.contentcss}
      </style>
      ${this.content}
    `;

    // 不要更新内容
    return undefined;
  };
}
