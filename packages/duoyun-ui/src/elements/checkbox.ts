import {
  adoptedStyle,
  customElement,
  attribute,
  globalemitter,
  Emitter,
  boolattribute,
  property,
  slot,
} from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';
import { icons } from '../lib/icons';
import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';

import { groupStyle, Option } from './radio';

import './use';

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    cursor: default;
    display: inline-flex;
    align-items: center;
    gap: 0.5em;
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
`);

/**
 * @customElement dy-checkbox
 * @attr checked
 * @attr indeterminate
 * @attr value
 * @attr disabled
 */
@customElement('dy-checkbox')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
export class DuoyunCheckboxElement extends GemElement {
  @slot static unnamed: string;

  @boolattribute checked: boolean;
  @boolattribute indeterminate: boolean;
  @boolattribute disabled: boolean;
  @globalemitter change: Emitter<boolean>;
  @attribute value: string;

  constructor() {
    super({ delegatesFocus: true });
    this.addEventListener('click', this.#onClick);
  }

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

/**
 * @customElement dy-checkbox-group
 * @attr disabled
 */
@customElement('dy-checkbox-group')
@adoptedStyle(groupStyle)
export class DuoyunCheckboxGroupElement extends GemElement {
  @attribute orientation: 'horizontal' | 'vertical';
  @boolattribute disabled: boolean;
  @globalemitter change: Emitter<any[]>;
  @property value?: any[];
  @property options?: Option[];

  constructor() {
    super({ delegatesFocus: true });
    this.internals.role = 'group';
  }

  #valueSet: Set<any>;

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

  willMount = () => {
    this.memo(
      () => {
        this.#valueSet = new Set(this.value);
      },
      () => [this.value],
    );
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
