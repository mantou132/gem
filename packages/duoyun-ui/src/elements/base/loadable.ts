import { adoptedStyle, customElement, boolattribute, shadow } from '@mantou/gem/lib/decorators';
import { GemElement, html, createCSSSheet } from '@mantou/gem/lib/element';
import { css } from '@mantou/gem/lib/utils';

import { theme } from '../../lib/theme';

import '../loading';

const maskStyle = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    position: absolute;
    z-index: ${theme.popupZIndex};
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .mask {
    position: absolute;
    z-index: 0;
    inset: 0;
    background-color: rgba(0, 0, 0, calc(${theme.maskAlpha} / 2));
  }
`);

/**
 * @customElement dy-loadable-mask
 */
@customElement('dy-loadable-mask')
@adoptedStyle(maskStyle)
@shadow()
export class DuoyunLoadableMaskElement extends GemElement {
  render = () => {
    return html`
      <div class="mask"></div>
      <dy-loading></dy-loading>
    `;
  };
}

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    display: block;
    position: relative;
    z-index: 1;
    overflow: hidden;
  }
`);

/**
 * @attr loading
 */
@adoptedStyle(style)
@shadow()
export class DuoyunLoadableBaseElement<T = Record<string, unknown>> extends GemElement<T> {
  @boolattribute loading: boolean;

  constructor() {
    super();
    const mask = new DuoyunLoadableMaskElement();
    this.effect(() => {
      this.internals.ariaBusy = String(this.loading);
      if (this.loading) {
        this.shadowRoot!.append(mask);
      } else {
        mask.remove();
      }
    });
  }
}
