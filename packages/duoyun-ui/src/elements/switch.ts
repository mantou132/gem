import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  customElement,
  attribute,
  globalemitter,
  boolattribute,
  slot,
  shadow,
  mounted,
} from '@mantou/gem/lib/decorators';
import { GemElement, html, css } from '@mantou/gem/lib/element';
import { addListener } from '@mantou/gem/lib/utils';
import { createDecoratorTheme } from '@mantou/gem/helper/theme';

import { theme, getSemanticColor } from '../lib/theme';
import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';

const elementTheme = createDecoratorTheme({ color: '' });

const style = css`
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
  .switch {
    height: 1.2em;
    aspect-ratio: 9 / 5;
    border-radius: 10em;
    opacity: 0.8;
    background: ${elementTheme.color};
    transition: all 0.3s ${theme.timingFunction};
    transition-property: background, opacity, margin-inline-start;
  }
  :host(:hover:not([disabled])) .switch {
    opacity: 1;
  }
  :host([checked]) .switch {
    background: ${elementTheme.color};
  }
  :host(:not([disabled])) .switch {
    box-shadow: ${theme.controlShadow};
  }
  .switch::before {
    content: '';
    display: block;
    transition: inherit;
    height: calc(100% - 4px);
    aspect-ratio: 1;
    border-radius: inherit;
    border: 2px solid transparent;
    background: ${theme.lightBackgroundColor};
    background-clip: content-box;
  }
  :host(:not([disabled])) .switch::before {
    filter: drop-shadow(${theme.controlShadow});
  }
  :host([checked]) .switch::before {
    margin-inline-start: calc(100% * 4 / 9);
  }
`;

@customElement('dy-switch')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
@shadow({ delegatesFocus: true })
export class DuoyunSwitchElement extends GemElement {
  @slot static unnamed: string;

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

  #onClick = () => {
    if (!this.disabled) {
      this.change(!this.checked);
    }
  };

  @mounted()
  #init = () => addListener(this, 'click', this.#onClick);

  @elementTheme()
  #theme = () => {
    if (this.disabled) return { color: theme.neutralColor };
    if (this.checked) return { color: this.#checkedColor };
    return { color: theme.borderColor };
  };

  render = () => {
    return html`
      <div
        class="switch"
        @keydown=${commonHandle}
        role="switch"
        tabindex=${-Number(this.disabled)}
        aria-disabled=${this.disabled}
        aria-labelledby="label"
        aria-checked=${this.checked}
      ></div>
      <slot id="label"></slot>
    `;
  };
}
