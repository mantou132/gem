import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  aria,
  boolattribute,
  connectStore,
  customElement,
  globalemitter,
  numattribute,
  part,
  shadow,
} from '@mantou/gem/lib/decorators';
import { createRef, css, GemElement, html } from '@mantou/gem/lib/element';

import { repeatPress } from '../lib/directives';
import { icons } from '../lib/icons';
import { locale } from '../lib/locale';
import { clamp } from '../lib/number';
import { focusStyle } from '../lib/styles';
import { theme } from '../lib/theme';
import type { TapInputElement } from './input';

import './input';
import './use';

const style = css`
  :host(:where(:not([hidden]))) {
    font-size: 0.875em;
    inline-size: fit-content;
    position: relative;
    display: inline-flex;
    align-items: stretch;
    line-height: 1;
    background-color: transparent;
    box-sizing: border-box;
    border: 1px solid ${theme.borderColor};
    border-radius: ${theme.normalRound};
    outline: none;
    overflow: hidden;
    block-size: calc(2.2em + 2px);
    vertical-align: middle;
  }
  :host(:not([disabled])) {
    box-shadow: ${theme.controlShadow};
  }
  :host(:where(:focus-within, :hover):not([disabled])) {
    border-color: ${theme.primaryColor};
  }
  :host([disabled]) {
    cursor: not-allowed;
    border-color: transparent;
    background: ${theme.disabledColor};
    box-shadow: none;
  }
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    inline-size: 2.2em;
    flex-shrink: 0;
    cursor: pointer;
    background: ${theme.lightBackgroundColor};
    color: inherit;
    border: none;
    padding: 0;
    margin: 0;
    font: inherit;
    outline: none;
    transition: background-color 0.1s, opacity 0.1s;
    -webkit-tap-highlight-color: transparent;
  }
  .btn:hover:not([aria-disabled='true']) {
    background: ${theme.hoverBackgroundColor};
  }
  .btn:active:not([aria-disabled='true']) {
    background: ${theme.borderColor};
  }
  .btn[aria-disabled='true'] {
    cursor: not-allowed;
    opacity: 0.3;
    pointer-events: none;
  }
  .icon {
    inline-size: 1.2em;
    block-size: 1.2em;
    flex-shrink: 0;
  }
  .input {
    inline-size: 3.5em;
    border: none !important;
    border-inline: 1px solid ${theme.borderColor} !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    font-size: inherit;
  }
  .input::part(input) {
    text-align: center;
    padding-inline: 0.25em;
  }
  :host([disabled]) .btn {
    cursor: not-allowed;
    background: transparent;
  }
  :host([disabled]) .input {
    border-color: transparent !important;
  }
`;

@customElement('tap-stepper')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
@connectStore(locale)
@connectStore(icons)
@shadow({ delegatesFocus: true })
@aria({ role: 'group' })
export class TapStepperElement extends GemElement {
  @part static minus: string;
  @part static input: string;
  @part static plus: string;

  @numattribute value: number;
  @numattribute min: number;
  @numattribute max: number;
  @numattribute step: number;
  @numattribute precision: number;

  @boolattribute disabled: boolean;
  @boolattribute disableInput: boolean;

  @globalemitter change: Emitter<number>;

  #inputRef = createRef<TapInputElement>();

  get #step() {
    return this.step || 1;
  }

  get #min() {
    return this.attributes.min ? this.min : -Infinity;
  }

  get #max() {
    return this.attributes.max ? this.max : Infinity;
  }

  get #value() {
    if (this.attributes.value) return this.value;
    return this.#min > -Infinity ? this.#min : 0;
  }

  get #precision() {
    if (this.attributes.precision) return this.precision;
    const stepStr = String(this.#step);
    const index = stepStr.indexOf('.');
    return index >= 0 ? stepStr.length - index - 1 : 0;
  }

  get #disabledMinus() {
    return this.disabled || this.#value <= this.#min;
  }

  get #disabledPlus() {
    return this.disabled || this.#value >= this.#max;
  }

  focus = (options?: FocusOptions) => this.#inputRef.value?.focus(options);
  blur = () => this.#inputRef.value?.blur();

  #format = (val: number) => {
    return Number(val.toFixed(this.#precision));
  };

  #setValue = (next: number) => {
    const clamped = clamp(this.#min, this.#format(next), this.#max);
    if (this.#inputRef.value && this.#inputRef.value.value !== String(clamped)) {
      this.#inputRef.value.value = String(clamped);
    }
    if (clamped !== this.value) {
      this.change(clamped);
    }
  };

  #stepValue = (direction: 1 | -1) => {
    if (this.disabled) return false;
    const current = this.#value;
    if (direction < 0 && current <= this.#min) return false;
    if (direction > 0 && current >= this.#max) return false;

    const next = this.#format(current + direction * this.#step);
    const clamped = clamp(this.#min, next, this.#max);
    if (clamped !== this.value) {
      this.change(clamped);
    }
    return (direction > 0 && clamped < this.#max) || (direction < 0 && clamped > this.#min);
  };

  #onInputChange = (evt: CustomEvent<string>) => {
    evt.stopPropagation();
    const val = Number(evt.detail);
    if (!Number.isNaN(val)) {
      this.#setValue(val);
    }
  };

  #onInputBlur = () => {
    const raw = this.#inputRef.value?.value;
    const val = Number(raw);
    if (!Number.isNaN(val) && raw !== '') {
      this.#setValue(val);
    } else if (this.#inputRef.value) {
      this.#inputRef.value.value = String(this.#value);
    }
  };

  render = () => {
    return html`
      <button
        type="button"
        class="btn minus"
        part=${TapStepperElement.minus}
        aria-label=${locale.less || 'Decrease'}
        aria-disabled=${this.#disabledMinus}
        tabindex=${this.#disabledMinus ? -1 : 0}
        ${repeatPress(() => this.#stepValue(-1), { disabled: this.#disabledMinus })}
      >
        <tap-use class="icon" .element=${icons.minus}></tap-use>
      </button>
      <tap-input
        ${this.#inputRef}
        class="input"
        part=${TapStepperElement.input}
        type="number"
        .value=${String(this.#value)}
        ?disabled=${this.disabled}
        ?readonly=${this.disableInput}
        min=${this.attributes.min ? this.min : undefined}
        max=${this.attributes.max ? this.max : undefined}
        step=${this.#step}
        @change=${this.#onInputChange}
        @blur=${this.#onInputBlur}
      ></tap-input>
      <button
        type="button"
        class="btn plus"
        part=${TapStepperElement.plus}
        aria-label=${locale.more || 'Increase'}
        aria-disabled=${this.#disabledPlus}
        tabindex=${this.#disabledPlus ? -1 : 0}
        ${repeatPress(() => this.#stepValue(1), { disabled: this.#disabledPlus })}
      >
        <tap-use class="icon" .element=${icons.add}></tap-use>
      </button>
    `;
  };
}
