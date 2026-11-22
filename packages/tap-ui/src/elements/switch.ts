import { createDecoratorTheme } from '@mantou/gem/helper/theme';
import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  aria,
  attribute,
  boolattribute,
  customElement,
  effect,
  globalemitter,
  mounted,
  shadow,
  slot,
  state,
} from '@mantou/gem/lib/decorators';
import { css, GemElement, html } from '@mantou/gem/lib/element';
import { addListener } from '@mantou/gem/lib/utils';

import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';
import { getSemanticColor, theme } from '../lib/theme';

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
    height: 1.8em;
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

@customElement('tap-switch')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
@shadow()
@aria({ focusable: true, role: 'switch' })
export class TapSwitchElement extends GemElement {
  @slot static unnamed: string;

  @boolattribute disabled: boolean;
  @boolattribute checked: boolean;
  @attribute value: string;
  @attribute label: string;
  @attribute neutral: 'positive' | 'negative' | 'neutral' | 'informative';
  @globalemitter change: Emitter<boolean>;
  @state delegateFocus = true;

  get #checkedColor() {
    const semanticColor = getSemanticColor(this.neutral);
    if (semanticColor) return semanticColor;
    return theme.positiveColor;
  }

  #onClick = () => {
    if (!this.disabled) {
      this.change(!this.checked);
    }
  };

  @mounted()
  #init = () => {
    const removeClick = addListener(this, 'click', this.#onClick);
    const removeKeydown = addListener(this, 'keydown', commonHandle);
    return () => {
      removeClick();
      removeKeydown();
    };
  };

  @effect((i) => [i.checked])
  #updateAria = () => {
    this.internals.ariaChecked = String(this.checked);
  };

  @elementTheme()
  #theme = () => {
    if (this.disabled) return { color: theme.neutralColor };
    if (this.checked) return { color: this.#checkedColor };
    return { color: theme.borderColor };
  };

  render = () => {
    return html`
      <div class="switch delegate-focus"></div>
      <slot>${this.label}</slot>
    `;
  };
}
