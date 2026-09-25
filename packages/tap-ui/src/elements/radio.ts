import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  aria,
  attribute,
  boolattribute,
  customElement,
  globalemitter,
  mounted,
  property,
  shadow,
  slot,
} from '@mantou/gem/lib/decorators';
import type { TemplateResult } from '@mantou/gem/lib/element';
import { css, GemElement, html } from '@mantou/gem/lib/element';
import { addListener } from '@mantou/gem/lib/utils';

import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';
import { theme } from '../lib/theme';

const style = css`
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
  :host(:not([disabled])) .radio {
    box-shadow: ${theme.controlShadow};
  }
  :host(:where(:hover, [checked])) .radio {
    color: ${theme.primaryColor};
  }
  :host([checked]) .radio {
    background-color: currentColor;
  }
`;

@customElement('tap-radio')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
@shadow({ delegatesFocus: true })
export class TapRadioElement extends GemElement {
  @slot static unnamed: string;

  @boolattribute checked: boolean;
  @boolattribute disabled: boolean;
  @globalemitter change: Emitter<string>;

  @attribute value: string;

  #onClick = () => {
    if (this.disabled) return;
    if (!this.checked) this.change(this.value);
  };

  @mounted()
  #init = () => addListener(this, 'click', this.#onClick);

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

export const groupStyle = css`
  :scope:where(:not([hidden])) {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    &:not([orientation='vertical']) {
      gap: 1em;
    }
    &[orientation='vertical'] {
      flex-direction: column;
      align-items: flex-start;
    }
  }
  :scope:where(tap-checkbox-group, tap-radio-group) {
    display: block;
    width: 100%;
    color: ${theme.textColor};
    &:not(:first-of-type) {
      margin-block-start: 0.5em;
    }
    .heading {
      padding: 0.75em calc(1.0625em / 0.8125) 0.5em;
      font-size: 0.8125em;
      line-height: 1.3;
      color: ${theme.describeColor};
    }
    .item {
      display: flex;
      align-items: center;
      gap: 0.75em;
      min-height: 3.5em;
      padding: 0.75em 1em;
      box-sizing: border-box;
      position: relative;
      cursor: pointer;
      font-size: 1.0625em;
      line-height: 1.4;
      color: ${theme.highlightColor};
      background: ${theme.backgroundColor};
      &:active {
        background: ${theme.hoverBackgroundColor};
      }
      &:not(:last-of-type)::after {
        content: '';
        position: absolute;
        inset-inline-start: calc(1em + 1em + 0.75em);
        inset-inline-end: 0;
        inset-block-end: 0;
        border-block-end: 1px solid ${theme.borderColor};
        pointer-events: none;
      }
      &[disabled] {
        cursor: not-allowed;
        opacity: 0.3;
        &:active {
          background: ${theme.backgroundColor};
        }
      }
    }
    .label {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .description {
      font-size: 0.94em;
      color: ${theme.describeColor};
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
`;

export interface Option<T = any> {
  label: string | TemplateResult;
  value?: T;
  description?: string | TemplateResult;
  disabled?: boolean;
}

@customElement('tap-radio-group')
@adoptedStyle(groupStyle)
@aria({ role: 'radiogroup' })
export class TapRadioGroupElement extends GemElement {
  @attribute orientation: 'horizontal' | 'vertical';
  @attribute heading: string;
  @boolattribute disabled: boolean;
  @globalemitter change: Emitter<any>;
  @property value?: any;
  @property options?: Option[];

  #onChange = (evt: CustomEvent<string>) => {
    evt.stopPropagation();
    this.change(evt.detail);
  };

  render = () => {
    if (!this.options) return null;
    return html`
      <div class="heading" v-if=${!!this.heading}>${this.heading}</div>
      ${this.options.map(
        ({ label, value, disabled, description }) => html`
          <tap-radio
            class="item"
            ?disabled=${this.disabled || disabled}
            .value=${value ?? label}
            ?checked=${(value ?? label) === this.value}
            @change=${this.#onChange}
          >
            <span class="label">${label}</span>
            <span v-if=${!!description} class="description">${description}</span>
          </tap-radio>
        `,
      )}
    `;
  };
}
