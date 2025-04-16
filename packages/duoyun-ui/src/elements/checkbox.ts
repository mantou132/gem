import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  aria,
  attribute,
  boolattribute,
  customElement,
  globalemitter,
  memo,
  mounted,
  property,
  shadow,
  slot,
} from '@mantou/gem/lib/decorators';
import { css, GemElement, html } from '@mantou/gem/lib/element';
import { addListener } from '@mantou/gem/lib/utils';

import { commonHandle } from '../lib/hotkeys';
import { icons } from '../lib/icons';
import { focusStyle } from '../lib/styles';
import { theme } from '../lib/theme';
import type { Option } from './radio';
import { groupStyle } from './radio';

import './use';

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
  .checkbox {
    box-sizing: border-box;
    width: 1em;
    aspect-ratio: 1;
    /* webkit bug */
    height: 1em;
    background-clip: content-box;
    padding: 0;
    color: ${theme.backgroundColor};
    border: 1px solid ${theme.primaryColor};
    border-radius: ${theme.smallRound};
    transform: scale(1.001);
    transition: background 0.1s;
  }
  :host(:not([disabled])) .checkbox {
    box-shadow: ${theme.controlShadow};
  }
  .checkbox::part(icon) {
    stroke-width: 1px;
    stroke: white;
  }
  :host([checked]) .checkbox {
    background-color: ${theme.primaryColor};
  }
  :host([indeterminate]) .checkbox {
    padding: 2px;
    background-color: ${theme.primaryColor};
  }
`;

@customElement('dy-checkbox')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
@shadow({ delegatesFocus: true })
export class DuoyunCheckboxElement extends GemElement {
  @slot static unnamed: string;

  @boolattribute checked: boolean;
  @boolattribute indeterminate: boolean;
  @boolattribute disabled: boolean;
  @globalemitter change: Emitter<boolean>;
  @attribute value: string;

  @mounted()
  #init = () => addListener(this, 'click', this.#onClick);

  #onClick = () => {
    if (this.disabled) return;
    this.change(!this.checked);
  };

  render = () => {
    return html`
      <dy-use
        role="checkbox"
        tabindex=${-Number(this.disabled)}
        aria-disabled=${this.disabled}
        aria-labelledby="label"
        aria-checked=${this.indeterminate ? 'mixed' : this.checked}
        class="checkbox"
        @keydown=${commonHandle}
        .element=${this.checked ? icons.check : undefined}
      ></dy-use>
      <slot id="label"></slot>
    `;
  };
}

@customElement('dy-checkbox-group')
@adoptedStyle(groupStyle)
@aria({ role: 'group' })
export class DuoyunCheckboxGroupElement extends GemElement {
  @attribute orientation: 'horizontal' | 'vertical';
  @boolattribute disabled: boolean;
  @globalemitter change: Emitter<any[]>;
  @property value?: any[];
  @property options?: Option[];

  #valueSet: Set<any>;

  @memo((i) => [i.value])
  #setValueSet = () => (this.#valueSet = new Set(this.value));

  #onChange = (evt: CustomEvent<boolean>, value: string) => {
    evt.stopPropagation();
    const newValue = new Set(this.#valueSet);
    if (evt.detail) {
      newValue.add(value);
    } else {
      newValue.delete(value);
    }
    this.change([...newValue]);
  };

  render = () => {
    if (!this.options) return null;
    return html`${this.options.map(
      ({ label, value }) => html`
        <dy-checkbox
          ?disabled=${this.disabled}
          ?checked=${this.#valueSet.has(value ?? label)}
          @change=${(evt: CustomEvent<boolean>) => this.#onChange(evt, value ?? label)}
        >
          ${label}
        </dy-checkbox>
      `,
    )}`;
  };
}
