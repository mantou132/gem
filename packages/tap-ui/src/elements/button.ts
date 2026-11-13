import { createDecoratorTheme } from '@mantou/gem/helper/theme';
import {
  adoptedStyle,
  attribute,
  boolattribute,
  customElement,
  mounted,
  part,
  property,
  shadow,
  slot,
  state,
} from '@mantou/gem/lib/decorators';
import { css, GemElement, html } from '@mantou/gem/lib/element';
import { history } from '@mantou/gem/lib/history';
import { addListener, QueryString } from '@mantou/gem/lib/utils';

import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';
import { getSemanticColor, theme } from '../lib/theme';
import type { StringList } from '../lib/types';
import type { RouteItem } from './route';
import { createHistoryParams } from './route';

import './use';

export const buttonTheme = createDecoratorTheme({ bg: '', color: '' });

const style = css`
  :host(:where(:not([hidden]))) {
    display: inline-flex;
    align-items: stretch;
    line-height: 1.2;
    cursor: default;
    font-size: 0.875em;
    border-radius: ${theme.normalRound};
    white-space: nowrap;
    height: 2.5rem;
  }
  :host(:not([borderless], [disabled])) {
    box-shadow: ${theme.controlShadow};
  }
  :host([round]) {
    border-radius: 10em;
  }
  .content {
    position: relative;
    color: ${buttonTheme.color};
    background: ${buttonTheme.bg};
    border: 1px solid ${buttonTheme.bg};
  }
  .content {
    flex-grow: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.3em;
    padding: 0.5em 1.5em;
    min-width: 3em;
    border-radius: inherit;
  }
  .icon {
    width: 1.2em;
  }
  :host([small]) {
    font-size: 0.75em;
    height: 2rem;
  }
  :host([small]) .content {
    min-width: auto;
    padding: 0.5em 0.8em;
  }
  :host([square]) {
    aspect-ratio: 1;
  }
  :host([square]) .content {
    min-width: auto;
    padding: 0.5em;
  }
  :host([type='reverse']) .content {
    color: ${buttonTheme.bg};
    border-color: ${buttonTheme.bg};
    background: transparent;
  }
  :host([borderless]) .content {
    border-color: transparent;
  }
  :host([disabled]) {
    cursor: not-allowed;
  }
  :where(:host(:state(active)) .content, .content:where(:hover))::after {
    content: '';
    position: absolute;
    inset: -1px;
    background-color: currentColor;
    border-radius: inherit;
    opacity: 0.1;
    transition: opacity 0.1s;
  }
  :active::after {
    opacity: 0.13;
  }
  :host([disabled]) ::after {
    content: none;
  }
`;

@customElement('tap-button')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
@shadow({ delegatesFocus: true })
export class TapButtonElement extends GemElement {
  @slot static unnamed: string;

  @part static button: string;

  @attribute type: 'solid' | 'reverse';
  @attribute color: StringList<'normal' | 'danger' | 'cancel'>;
  @boolattribute small: boolean;
  @boolattribute round: boolean;
  @boolattribute square: boolean;
  @boolattribute disabled: boolean;
  @boolattribute borderless: boolean;

  @property route?: RouteItem;
  @property params?: Record<string, string>;
  @property query?: Record<string, string>;
  @property icon?: string | Element | DocumentFragment;
  @state active: boolean;

  #onClick = () => {
    if (this.disabled) return;
    if (this.route) {
      history.push(
        createHistoryParams(this.route, {
          title: this.route.title,
          params: this.params,
          query: new QueryString(this.query),
        }),
      );
    }
  };

  @mounted()
  #init = () => addListener(this, 'click', this.#onClick);

  @buttonTheme()
  #theme = () => {
    if (this.disabled) return { bg: theme.disabledColor, color: theme.describeColor };
    switch (this.color) {
      case 'normal':
        return { bg: theme.primaryColor, color: theme.backgroundColor };
      case 'danger':
        return { bg: theme.negativeColor, color: theme.backgroundColor };
      case 'cancel':
        return { bg: theme.hoverBackgroundColor, color: theme.textColor };
      default:
        return { bg: getSemanticColor(this.color) || this.color || theme.primaryColor, color: theme.backgroundColor };
    }
  };

  render = () => {
    return html`
      <div
        role="button"
        tabindex=${-Number(this.disabled)}
        aria-disabled=${this.disabled}
        @keydown=${commonHandle}
        class="content"
        part=${TapButtonElement.button}
      >
        <tap-use v-if=${!!this.icon} class="icon" .element=${this.icon}></tap-use>
        <slot></slot>
      </div>
    `;
  };
}
