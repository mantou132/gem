import { GemElement, html } from '../';

export class Use extends GemElement {
  /**@attr */ ref: string; // CSS 选择器
  static observedAttributes = ['ref'];

  render() {
    const template = document.querySelector(this.ref);
    return html`
      <style>
        :host {
          position: relative;
        }
        :host(:not([hidden])) {
          display: inline-block;
        }
      </style>
      ${template && template.cloneNode(true)}
      <slot></slot>
    `;
  }
}

customElements.define('gem-use', Use);
