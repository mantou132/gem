// https://spectrum.adobe.com/page/divider/
import { adoptedStyle, customElement, attribute, aria, shadow, effect } from '@mantou/gem/lib/decorators';
import { GemElement, createCSSSheet } from '@mantou/gem/lib/element';
import { css } from '@mantou/gem/lib/utils';
import { createDecoratorTheme } from '@mantou/gem/helper/theme';

import { theme, getSemanticColor } from '../lib/theme';

const elementTheme = createDecoratorTheme({ width: '', height: '', color: '' });

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    display: block;
    border-radius: 10px;
    align-self: stretch;
    background: currentColor;
    width: ${elementTheme.width};
    height: ${elementTheme.height};
    color: ${elementTheme.color};
  }
`);

/**
 * @customElement dy-divider
 * @attr size
 * @attr orientation
 */
@customElement('dy-divider')
@adoptedStyle(style)
@aria({ role: 'separator' })
@shadow()
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

  get #color() {
    if (this.color) return getSemanticColor(this.color) || this.color;
    switch (this.size) {
      case 'large':
        return theme.textColor;
      default:
        return theme.borderColor;
    }
  }

  @effect()
  #updateAria = () => {
    this.internals.ariaOrientation = this.#orientation;
  };

  @elementTheme()
  #theme = () => ({ width: this.#width, height: this.#height, color: this.#color });
}
