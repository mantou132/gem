import {
  adoptedStyle,
  customElement,
  attribute,
  globalemitter,
  Emitter,
  property,
  boolattribute,
} from '@mantou/gem/lib/decorators';
import { GemElement, html, TemplateResult } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';
import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';

const style = createCSSSheet(css`
  :host {
    cursor: default;
    display: inline-flex;
    align-items: center;
    gap: 0.5em;
  }
  :host([disabled]) {
    cursor: not-allowed;
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
  }
  :host(:where(:hover, [checked])) .radio {
    color: ${theme.primaryColor};
  }
  :host([checked]) .radio {
    background-color: currentColor;
  }
  :host([disabled]) .radio {
    background-color: ${theme.disabledColor};
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
  @boolattribute checked: boolean;
  @boolattribute disabled: boolean;
  @globalemitter change: Emitter<string>;

  @attribute value: string;

  constructor() {
    super();
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
        tabindex="0"
        @keydown=${commonHandle}
        aria-labelledby="label"
        aria-disabled=${this.disabled}
        aria-checked=${this.checked}
        class="radio"
      ></div>
      <slot id="label"></slot>
    `;
  };
}

const groupStyle = createCSSSheet(css`
  :host {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
  }
  :host([orientation='vertical']) {
    flex-direction: column;
    align-items: flex-start;
  }
`);

export type Option = {
  label: string | TemplateResult;
  value?: any;
};

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
  @property value: any;
  @property options?: Option[];

  constructor() {
    super();
    this.internals.role = 'radiogroup';
  }

  render = () => {
    if (!this.options) return null;
    return html`${this.options.map(
      ({ label, value }) =>
        html`
          <dy-radio
            ?disabled=${this.disabled}
            ?checked=${(value ?? label) === this.value}
            @change=${() => this.change(value ?? label)}
          >
            ${label}
          </dy-radio>
        `,
    )}`;
  };
}