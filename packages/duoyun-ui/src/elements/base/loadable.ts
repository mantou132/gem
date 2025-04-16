import { adoptedStyle, boolattribute, customElement, effect, shadow } from '@mantou/gem/lib/decorators';
import { css, GemElement, html } from '@mantou/gem/lib/element';

import { theme } from '../../lib/theme';

import '../loading';

const maskStyle = css`
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
`;

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

const style = css`
  :host(:where(:not([hidden]))) {
    display: block;
    position: relative;
    z-index: 1;
    overflow: hidden;
  }
`;

@adoptedStyle(style)
@shadow()
export class DuoyunLoadableBaseElement extends GemElement {
  @boolattribute loading: boolean;

  #mask = new DuoyunLoadableMaskElement();

  @effect()
  #effect = () => {
    this.internals.ariaBusy = String(this.loading);
    if (this.loading) {
      this.shadowRoot!.append(this.#mask);
    } else {
      this.#mask.remove();
    }
  };
}
