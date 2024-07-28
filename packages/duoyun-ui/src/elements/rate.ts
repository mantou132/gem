// https://spectrum.adobe.com/page/rating/
import {
  adoptedStyle,
  customElement,
  globalemitter,
  Emitter,
  boolattribute,
  numattribute,
  part,
  shadow,
  aria,
} from '@mantou/gem/lib/decorators';
import { GemElement, html, createCSSSheet } from '@mantou/gem/lib/element';
import { css, classMap } from '@mantou/gem/lib/utils';

import { createDataURLFromSVG } from '../lib/image';
import { icons } from '../lib/icons';
import { theme } from '../lib/theme';
import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';

import './use';

const starUrl = createDataURLFromSVG(icons.star);

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    display: inline-flex;
    flex-direction: row-reverse;
    align-items: center;
    color: ${theme.noticeColor};
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
    transition: transform 0.1s ${theme.timingFunction};
  }
  .icon:active::part(icon) {
    transform: scale(1.2);
  }
  :host(:where(:not(:hover), [readonly])) .fill::part(icon),
  :host(:not([readonly])) .icon:hover::part(icon),
  :host(:not([readonly])) .icon:hover ~ .icon::part(icon) {
    fill: currentColor;
  }
`);

/**
 * @customElement dy-rate
 */
@customElement('dy-rate')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
@shadow({ delegatesFocus: true })
@aria({ role: 'range' })
export class DuoyunRateElement extends GemElement {
  @part static star: string;

  @numattribute value: number;
  @numattribute total: number;
  @boolattribute disabled: boolean;
  @boolattribute readonly: boolean;
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
    this.effect(() => {
      this.internals.ariaDisabled = String(this.disabled);
      this.internals.ariaLabel = `${this.value}/${this.total}`;
      this.internals.ariaValueMax = String(this.#total);
      this.internals.ariaValueNow = String(this.value);
    });
  }

  #onClick = (score: number) => {
    if (this.readonly) return;
    this.change(score);
  };

  render = () => {
    return html`
      <style>
        :host(:where(:not(:hover), [readonly])) .mask::part(icon) {
          background-image: linear-gradient(
            to right,
            currentColor ${this.#ratio * 100}%,
            transparent ${this.#ratio * 100}%
          );
        }
      </style>
      ${Array.from(
        { length: this.#total },
        (_, index) => html`
          <dy-use
            part=${DuoyunRateElement.star}
            class=${classMap({
              icon: true,
              fill: this.value >= this.#total - index,
              mask: this.value < this.#total - index && this.value > this.#total - 1 - index,
            })}
            tabindex=${-Number(this.disabled)}
            aria-disabled=${this.disabled}
            @keydown=${commonHandle}
            @click=${() => this.#onClick(this.#total - index)}
            .element=${icons.star}
          ></dy-use>
        `,
      )}
    `;
  };
}
