// https://spectrum.adobe.com/page/rating/
import {
  adoptedStyle,
  customElement,
  globalemitter,
  Emitter,
  boolattribute,
  numattribute,
} from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css, classMap } from '@mantou/gem/lib/utils';

import { createDataURLFromSVG } from '../lib/image';
import { icons } from '../lib/icons';
import { theme } from '../lib/theme';
import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';

import '@mantou/gem/elements/use';

const starUrl = createDataURLFromSVG(icons.star);

const style = createCSSSheet(css`
  :host {
    display: inline-flex;
    flex-direction: row-reverse;
    align-items: center;
  }
  :host([disabled]) {
    color: ${theme.disabledColor};
    pointer-events: none;
  }
  .icon {
    width: 1.5em;
  }
  .icon:not(:last-child) {
    padding-inline-start: 0.1em;
  }
  .icon + .icon {
    padding-inline-end: 0.1em;
  }
  .icon::part(icon) {
    fill: none;
    stroke: currentColor;
    stroke-width: 2px;
    -webkit-mask: url(${starUrl}) center / 100%;
    mask: url(${starUrl}) center / 100%;
  }
  :host(:not(:hover)) .fill::part(icon),
  .icon:hover::part(icon),
  .icon:hover ~ .icon::part(icon) {
    fill: currentColor;
  }
`);

/**
 * @customElement dy-rating
 */
@customElement('dy-rating')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
export class DuoyunRatingElement extends GemElement {
  @numattribute value: number;
  @numattribute total: number;
  @boolattribute disabled: boolean;
  @globalemitter change: Emitter<number>;

  get #total() {
    return this.total || 5;
  }

  get #ratio() {
    const origin = this.value % 1;
    const offset = 0.2;
    return offset + (1 - 2 * offset) * origin;
  }

  constructor() {
    super();
    this.internals.role = 'range';
    this.effect(() => {
      this.internals.ariaDisabled = String(this.disabled);
      this.internals.ariaLabel = `${this.value}/${this.total}`;
      this.internals.ariaValueMax = String(this.#total);
      this.internals.ariaValueNow = String(this.value);
    });
  }

  #onClick = (score: number) => {
    this.change(score);
  };

  render = () => {
    return html`
      <style>
        :host(:not(:hover)) .mask::part(icon) {
          background-image: linear-gradient(
            to right,
            currentColor ${this.#ratio * 100}%,
            transparent ${this.#ratio * 100}%
          );
        }
      </style>
      ${Array.from(
        { length: this.#total },
        (_, index) =>
          html`
            <gem-use
              class=${classMap({
                icon: true,
                fill: this.value >= this.#total - index,
                mask: this.value < this.#total - index && this.value > this.#total - 1 - index,
              })}
              tabindex="0"
              @keydown=${commonHandle}
              @click=${() => this.#onClick(this.#total - index)}
              .element=${icons.star}
            ></gem-use>
          `,
      )}
    `;
  };
}
