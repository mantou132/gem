import { adoptedStyle, customElement, boolattribute } from '@mantou/gem/lib/decorators';
import { GemElement, html, GemElementOptions } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

import { theme } from '../../lib/theme';

import '../loading';

const maskStyle = createCSSSheet(css`
  :host {
    position: absolute;
    z-index: 9999999;
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
export class DuoyunLoadableMaskElement extends GemElement {
  render = () => {
    return html`
      <div class="mask"></div>
      <dy-loading></dy-loading>
    `;
  };
}

const style = createCSSSheet(css`
  :host {
    display: block;
    position: relative;
    overflow: hidden;
  }
`);

/**
 * @attr loading
 */
@adoptedStyle(style)
export class DuoyunLoadableBaseElement<T = Record<string, unknown>> extends GemElement<T> {
  @boolattribute loading: boolean;

  constructor(options?: GemElementOptions) {
    super(options);
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