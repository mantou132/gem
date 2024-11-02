import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  connectStore,
  adoptedStyle,
  customElement,
  attribute,
  emitter,
  boolattribute,
  slot,
  shadow,
  aria,
} from '@mantou/gem/lib/decorators';
import { GemElement, html, css } from '@mantou/gem/lib/element';
import { createDecoratorTheme } from '@mantou/gem/helper/theme';

import { icons } from '../lib/icons';
import { theme, getSemanticColor } from '../lib/theme';
import type { StringList } from '../lib/types';
import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';

import './use';

const elementTheme = createDecoratorTheme({ color: '', borderColor: '', bg: '' });

const style = css`
  :host(:where(:not([hidden]))) {
    cursor: default;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.3em;
    font-size: 0.875em;
    line-height: 1.2;
    padding: 0.5em 0.6em;
    border-radius: ${theme.normalRound};
    border-width: 1px;
    border-style: solid;
    border-color: ${elementTheme.borderColor};
    color: ${elementTheme.color};
    background-color: ${elementTheme.bg};
  }
  :host([small]) {
    font-size: 0.75em;
  }
  .close {
    width: 1.2em;
    opacity: 0.7;
    flex-shrink: 0;
  }
  .close:hover {
    opacity: 1;
  }
`;

export type PresetColor = 'positive' | 'informative' | 'negative' | 'notice' | 'default';

@customElement('dy-tag')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
@connectStore(icons)
@shadow({ delegatesFocus: true })
@aria({ role: 'mark' })
export class DuoyunTagElement extends GemElement {
  @slot static unnamed: string;

  @boolattribute closable: boolean;
  @attribute color: StringList<PresetColor>;
  /**@deprecated */
  @attribute mode: 'solid' | 'reverse';
  @attribute type: 'solid' | 'reverse';
  @boolattribute small: boolean;

  @emitter close: Emitter<null>;

  get #color() {
    const semanticColor = getSemanticColor(this.color);
    if (semanticColor) return semanticColor;
    switch (this.color) {
      case '':
      case 'default':
        return theme.hoverBackgroundColor;
      default:
        return this.color;
    }
  }

  get #type() {
    return this.type || this.mode || 'solid';
  }

  #onClose = (e: MouseEvent) => {
    e.stopPropagation();
    this.close(null);
  };

  @elementTheme()
  #theme = () => {
    const isSolid = this.#type === 'solid';
    const isDefault = this.color === 'default' || this.color === '';
    return {
      color: isDefault ? theme.textColor : isSolid ? theme.backgroundColor : this.#color,
      bg: isSolid ? this.#color : 'transparent',
      borderColor: this.#color,
    };
  };

  render = () => {
    return html`
      <slot></slot>
      ${this.closable
        ? html`
            <dy-use
              tabindex="0"
              role="button"
              class="close"
              @keydown=${commonHandle}
              @click=${this.#onClose}
              .element=${icons.close}
            ></dy-use>
          `
        : ''}
    `;
  };
}
