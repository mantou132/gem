import { GemElement, html, attribute, customElement } from '../';

/**
 * @attr ref
 */
@customElement('gem-use')
export class Use extends GemElement {
  @attribute ref: string; // CSS 选择器

  private getContent() {
    // 只支持 `svg` 或者 `template>svg`
    const ele = document.querySelector(this.ref);
    if (ele instanceof HTMLTemplateElement) {
      return ele.content.cloneNode(true);
    } else if (ele instanceof SVGSVGElement) {
      return ele.cloneNode(true);
    } else {
      return null;
    }
  }

  render() {
    return html`
      <style>
        :host {
          position: relative;
        }
        :host(:not([hidden])) {
          display: inline-block;
        }
        svg {
          width: 100%;
          height: 100%;
        }
      </style>
      ${this.getContent()}
      <slot></slot>
    `;
  }
}
