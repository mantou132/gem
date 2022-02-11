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

import { theme, getSemanticColor } from '../lib/theme';
import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';

const style = createCSSSheet(css`
  :host {
    --color: ${theme.borderColor};
    display: inline-flex;
    align-items: center;
    gap: 0.5em;
  }
  .switch {
    height: 1.2em;
    aspect-ratio: 9 / 5;
    border-radius: 10em;
    opacity: 0.8;
    background: var(--color);
    transition: all 0.3s ${theme.timingFunction};
    transition-property: background, opacity, margin-inline-start;
  }
  :host([disabled]) .switch {
    opacity: 0.4;
    cursor: not-allowed;
  }
  :host(:hover:not([disabled])) .switch {
    opacity: 1;
  }
  :host([checked]) .switch {
    background: var(--color);
  }
  .switch::before {
    content: '';
    display: block;
    transition: inherit;
    height: calc(100% - 4px);
    aspect-ratio: 1;
    border-radius: inherit;
    border: 2px solid var(--color);
    background: ${theme.lightBackgroundColor};
  }
  :host([checked]) .switch::before {
    margin-inline-start: calc(100% * 4 / 9);
  }
`);

/**
 * @customElement dy-switch
 * @attr checked
 * @attr value
 * @attr neutral
 */
@customElement('dy-switch')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
export class DuoyunSwitchElement extends GemElement {
  @boolattribute disabled: boolean;
  @boolattribute checked: boolean;
  @attribute value: string;
  @attribute neutral: 'positive' | 'negative' | 'neutral' | 'informative';
  @globalemitter change: Emitter<boolean>;

  get #checkedColor() {
    const semanticColor = getSemanticColor(this.neutral);
    if (semanticColor) return semanticColor;
    return theme.neutralColor;
  }

  constructor() {
    super();
    this.addEventListener('click', this.#onClick);
  }

  #onClick = () => {
    if (!this.disabled) {
      this.change(!this.checked);
    }
  };

  render = () => {
    return html`
      <style>
        :host([checked]) {
          --color: ${this.#checkedColor};
        }
      </style>
      <div
        class="switch"
        role="switch"
        tabindex="0"
        @keydown=${commonHandle}
        aria-disabled=${this.disabled}
        aria-labelledby="label"
        aria-checked=${this.checked}
      ></div>
      <slot id="label"></slot>
    `;
  };
}
