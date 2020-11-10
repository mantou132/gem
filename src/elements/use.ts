import { GemElement, html, attribute, property, customElement } from '../';

/**
 * svg 中的 `<use>` 不能穿透 ShadowDOM,
 * 此元素用来模拟 `<use>`,
 * 由于是复制元素，所以不能像 `<use>` 一样自动更新
 *
 * slot 支持为 icon 添加效果，如涟漪，徽章
 *
 * @customElement gem-use
 * @attr selector
 */
@customElement('gem-use')
export class GemUseElement extends GemElement {
  @attribute selector: string; // CSS 选择器
  @property root: HTMLElement | Document | ShadowRoot = document;

  private getContent() {
    // 只支持 `svg` 或者 `template > svg`
    const ele = this.root.querySelector(this.selector);
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
          display: inline-flex;
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
