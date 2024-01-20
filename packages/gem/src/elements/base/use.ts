import { GemElement, html } from '../../lib/element';
import { attribute, property, state } from '../../lib/decorators';

const eleCache = new Map<string, HTMLTemplateElement>();
/**
 * svg 中的 `<use>` 不能穿透 ShadowDOM,
 * 此元素用来模拟 `<use>`,
 * 由于是复制元素，所以不能像 `<use>` 一样自动更新
 * slot 支持为 icon 添加效果，如涟漪，徽章
 *
 * @customElement gem-use
 * @attr selector
 */
export class GemUseElement extends GemElement {
  @attribute selector: string; // CSS 选择器
  @property root?: HTMLElement | Document | ShadowRoot;
  @property element?: string | DocumentFragment | Element;

  @state active: boolean;

  #getContent = () => {
    const ele = this.element || (this.selector ? (this.root || document).querySelector(this.selector) : null);
    if (typeof ele === 'string') {
      let temp = eleCache.get(ele);
      if (!temp) {
        temp = document.createElement('template');
        temp.innerHTML = ele;
        eleCache.set(ele, temp);
      }
      return temp.content.cloneNode(true);
    } else if (ele instanceof HTMLTemplateElement) {
      return ele.content.cloneNode(true);
    } else {
      return ele?.cloneNode(true);
    }
  };

  render() {
    return html`
      <style>
        :host(:where(:not([hidden]))) {
          position: relative;
          display: inline-flex;
          align-items: center;
        }
        svg {
          width: 100%;
          height: 100%;
        }
      </style>
      ${this.#getContent()}
      <slot></slot>
    `;
  }
}
