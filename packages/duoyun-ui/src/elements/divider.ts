// https://spectrum.adobe.com/page/divider/
import { adoptedStyle, customElement, attribute } from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

import { theme, getSemanticColor } from '../lib/theme';

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    display: block;
    border-radius: 10px;
    align-self: stretch;
    background: currentColor;
  }
`);

/**
 * @customElement dy-divider
 * @attr size
 * @attr orientation
 */
@customElement('dy-divider')
@adoptedStyle(style)
export class DuoyunDividerElement extends GemElement {
  @attribute size: 'small' | 'medium' | 'large';
  @attribute color: string;
  @attribute orientation: 'horizontal' | 'vertical';

  get #orientation() {
    return this.orientation || 'horizontal';
  }

  get #size() {
    switch (this.size) {
      case 'large':
        return '4px';
      case 'medium':
        return '2px';
      default:
        return '1px';
    }
  }

  get #height() {
    if (this.#orientation === 'vertical') {
      return 'auto';
    }
    return this.#size;
  }

  get #width() {
    if (this.#orientation === 'vertical') {
      return this.#size;
    }
    return 'auto';
  }

  get #bgColor() {
    if (this.color) return getSemanticColor(this.color) || this.color;
    switch (this.size) {
      case 'large':
        return theme.textColor;
      default:
        return theme.borderColor;
    }
  }

  constructor() {
    super();
    this.internals.role = 'separator';
    this.effect(() => {
      this.internals.ariaOrientation = this.#orientation;
    });
  }

  render = () => {
    return html`
      <style>
        :host {
          width: ${this.#width};
          height: ${this.#height};
          color: ${this.#bgColor};
        }
      </style>
    `;
  };
}
