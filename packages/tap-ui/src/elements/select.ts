import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  attribute,
  boolattribute,
  customElement,
  effect,
  globalemitter,
  mounted,
  part,
  property,
  shadow,
} from '@mantou/gem/lib/decorators';
import type { TemplateResult } from '@mantou/gem/lib/element';
import { createRef, css, GemElement, html } from '@mantou/gem/lib/element';
import { classMap } from '@mantou/gem/lib/utils';

import { icons } from '../lib/icons';
import { focusStyle } from '../lib/styles';
import { theme } from '../lib/theme';

import './use';

export interface SelectOption {
  label: string | TemplateResult;
  value?: any;
  disabled?: boolean;
}

export type SelectItem = SelectOption | string | number;

const style = css`
  :host(:where(:not([hidden]))) {
    font-size: 0.875em;
    inline-size: 15em;
    block-size: calc(2.2em + 2px);
    position: relative;
    display: inline-flex;
    align-items: center;
    line-height: 1;
    background-color: transparent;
    box-sizing: border-box;
    border: 1px solid ${theme.borderColor};
    border-radius: ${theme.normalRound};
    outline: none;
    overflow: hidden;
  }
  :host(:not([disabled])) {
    box-shadow: ${theme.controlShadow};
  }
  :host(:where(:focus-within, :hover)) {
    border-color: ${theme.primaryColor};
  }
  :host([disabled]) {
    cursor: not-allowed;
    border-color: transparent;
    background: ${theme.disabledColor};
  }
  .icon {
    inline-size: 1.25em;
    flex-shrink: 0;
    margin-inline-start: 0.5em;
    pointer-events: none;
  }
  .select {
    box-sizing: border-box;
    cursor: inherit;
    font: inherit;
    text-align: inherit;
    line-height: 1.5;
    color: inherit;
    inline-size: 100%;
    block-size: 100%;
    padding-inline-start: 0.5em;
    padding-inline-end: 1.8em;
    border: none;
    border-radius: inherit;
    background: transparent;
    outline: none;
    -webkit-appearance: none;
    appearance: none;
    user-select: none;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
  }
  .select::-ms-expand {
    display: none;
  }
  .select.placeholder {
    color: ${theme.describeColor};
  }
  .arrow {
    position: absolute;
    inline-size: 1.25em;
    inset-inline-end: 0.4em;
    inset-block-start: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    opacity: 0.5;
  }
  :host([disabled]) .arrow {
    opacity: 0.2;
  }
  option {
    color: ${theme.textColor};
    background: ${theme.backgroundColor};
  }
`;

@customElement('tap-select')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
@shadow({ delegatesFocus: true })
export class TapSelectElement extends GemElement {
  @part static select: string;
  @part static icon: string;
  @part static arrow: string;

  @globalemitter change: Emitter<string>;

  @attribute name: string;
  @attribute value: string;
  @attribute placeholder: string;
  @boolattribute required: boolean;
  @boolattribute disabled: boolean;
  @boolattribute autofocus: boolean;

  @property options?: SelectItem[];
  @property icon?: string | Element | DocumentFragment;

  #selectRef = createRef<HTMLSelectElement>();

  get #val() {
    if (this.value) return this.value;
    if (this.placeholder) return '';
    return this.#selectRef.value?.options[0]?.value ?? '';
  }

  @mounted()
  #init = () => {
    if (this.autofocus) this.focus();
    this.#updateValue();
  };

  @effect((i) => [i.value])
  #updateValue = () => {
    const { value: element } = this.#selectRef;
    if (!element) return;
    element.value = this.#val;
  };

  #onChange = (evt: Event) => {
    evt.stopPropagation();
    const { value: element } = this.#selectRef;
    if (!element) return;
    const { value } = element;
    element.value = this.#val;
    this.change(value);
  };

  render = () => {
    return html`
      <tap-use
        v-if=${!!this.icon}
        part=${TapSelectElement.icon}
        class="icon"
        .element=${this.icon}
      ></tap-use>
      <select
        ${this.#selectRef}
        part=${TapSelectElement.select}
        class=${classMap({ select: true, placeholder: !this.value && !!this.placeholder })}
        name=${this.name}
        ?autofocus=${this.autofocus}
        ?required=${this.required}
        ?disabled=${this.disabled}
        @change=${this.#onChange}
      >
        <option
          v-if=${!!this.placeholder}
          value=""
          disabled
          ?selected=${!this.value}
          hidden
        >
          ${this.placeholder}
        </option>
        ${this.options?.map((item) => {
          const isObj = typeof item === 'object' && item !== null;
          const value = isObj ? ((item as SelectOption).value ?? (item as SelectOption).label) : item;
          const label = isObj ? (item as SelectOption).label : item;
          const disabled = isObj ? !!(item as SelectOption).disabled : false;
          return html`
            <option
              value=${value}
              ?disabled=${disabled}
              ?selected=${String(value) === String(this.#val)}
            >
              ${label}
            </option>
          `;
        })}
      </select>
      <tap-use
        part=${TapSelectElement.arrow}
        class="arrow"
        .element=${icons.expand}
      ></tap-use>
    `;
  };
}
