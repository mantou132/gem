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
  @property root?: HTMLElement | Document | ShadowRoot;
  @property element?: string | DocumentFragment | Element;

  private getContent() {
    const ele = this.element || (this.selector ? (this.root || document).querySelector(this.selector) : null);
    if (ele instanceof HTMLTemplateElement) {
      return ele.content.cloneNode(true);
    } else if (typeof ele === 'string') {
      const temp = document.createElement('template');
      temp.innerHTML = ele;
      return temp.content;
    } else {
      return ele?.cloneNode(true);
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
