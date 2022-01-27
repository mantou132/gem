import {
  adoptedStyle,
  customElement,
  attribute,
  globalemitter,
  Emitter,
  boolattribute,
} from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';
import { icons } from '../lib/icons';
import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';

import '@mantou/gem/elements/use';

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
  .checkbox {
    box-sizing: border-box;
    width: 1em;
    aspect-ratio: 1;
    background-clip: content-box;
    padding: 0;
    color: ${theme.backgroundColor};
    border: 1px solid ${theme.primaryColor};
    border-radius: ${theme.smallRound};
    transform: scale(1.001);
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
  :host([disabled]) .checkbox {
    background-color: ${theme.disabledColor};
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
  @boolattribute checked: boolean;
  @boolattribute indeterminate: boolean;
  @boolattribute disabled: boolean;
  @globalemitter change: Emitter<boolean>;
  @attribute value: string;

  constructor() {
    super();
    this.addEventListener('click', this.#onClick);
  }

  #onClick = () => {
    if (this.disabled) return;
    this.change(!this.checked);
  };

  render = () => {
    return html`
      <gem-use
        role="checkbox"
        tabindex="0"
        @keydown=${commonHandle}
        aria-disabled=${this.disabled}
        aria-labelledby="label"
        aria-checked=${this.indeterminate ? 'mixed' : this.checked}
        class="checkbox"
        .element=${this.checked ? icons.check : undefined}
      ></gem-use>
      <slot id="label"></slot>
    `;
  };
}
