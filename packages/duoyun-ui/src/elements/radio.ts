import {
  adoptedStyle,
  customElement,
  attribute,
  globalemitter,
  Emitter,
  property,
  boolattribute,
  slot,
} from '@mantou/gem/lib/decorators';
import { GemElement, html, TemplateResult } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';
import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    cursor: default;
    display: inline-flex;
    align-items: center;
    gap: 0.5em;
    line-height: 2;
  }
  :host([disabled]) {
    cursor: not-allowed;
    opacity: 0.3;
  }
  .radio {
    box-sizing: border-box;
    width: 1em;
    aspect-ratio: 1;
    border: 2px solid currentColor;
    color: ${theme.borderColor};
    background-clip: content-box;
    padding: 2px;
    border-radius: 10em;
    transform: scale(1.001);
    transition: background 0.1s;
  }
  :host(:where(:hover, [checked])) .radio {
    color: ${theme.primaryColor};
  }
  :host([checked]) .radio {
    background-color: currentColor;
  }
`);

/**
 * @customElement dy-radio
 * @attr checked
 * @attr value
 * @attr disabled
 */
@customElement('dy-radio')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
export class DuoyunRadioElement extends GemElement {
  @slot static unnamed: string;

  @boolattribute checked: boolean;
  @boolattribute disabled: boolean;
  @globalemitter change: Emitter<string>;

  @attribute value: string;

  constructor() {
    super({ delegatesFocus: true });
    this.addEventListener('click', this.#onClick);
  }

  #onClick = () => {
    if (this.disabled) return;
    if (!this.checked) {
      this.change(this.value);
    }
  };

  render = () => {
    return html`
      <div
        role="radio"
        @keydown=${commonHandle}
        tabindex=${-Number(this.disabled)}
        aria-disabled=${this.disabled}
        aria-checked=${this.checked}
        aria-labelledby="label"
        class="radio"
      ></div>
      <slot id="label"></slot>
    `;
  };
}

export const groupStyle = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
  }
  :host(:not([orientation='vertical'])) {
    gap: 1em;
  }
  :host([orientation='vertical']) {
    flex-direction: column;
    align-items: flex-start;
  }
`);

export interface Option<T = any> {
  label: string | TemplateResult;
  value?: T;
}

/**
 * @customElement dy-radio-group
 * @attr disabled
 */
@customElement('dy-radio-group')
@adoptedStyle(groupStyle)
export class DuoyunRadioGroupElement extends GemElement {
  @attribute orientation: 'horizontal' | 'vertical';
  @boolattribute disabled: boolean;
  @globalemitter change: Emitter<any>;
  @property value?: any;
  @property options?: Option[];

  constructor() {
    super({ delegatesFocus: true });
    this.internals.role = 'radiogroup';
  }

  #onChange = (evt: CustomEvent<string>) => {
    evt.stopPropagation();
    this.change(evt.detail);
  };

  render = () => {
    if (!this.options) return null;
    return html`${this.options.map(
      ({ label, value }) => html`
        <dy-radio
          ?disabled=${this.disabled}
          .value=${value ?? label}
          ?checked=${(value ?? label) === this.value}
          @change=${this.#onChange}
        >
          ${label}
        </dy-radio>
      `,
    )}`;
  };
}
