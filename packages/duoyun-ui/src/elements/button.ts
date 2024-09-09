import {
  connectStore,
  adoptedStyle,
  customElement,
  attribute,
  property,
  boolattribute,
  state,
  part,
  slot,
  shadow,
  mounted,
} from '@mantou/gem/lib/decorators';
import { createCSSSheet, GemElement, html, createRef } from '@mantou/gem/lib/element';
import { history } from '@mantou/gem/lib/history';
import { addListener, classMap, css, QueryString } from '@mantou/gem/lib/utils';
import { useDecoratorTheme } from '@mantou/gem/helper/theme';

import { theme, getSemanticColor } from '../lib/theme';
import { icons } from '../lib/icons';
import { commonHandle } from '../lib/hotkeys';
import type { StringList } from '../lib/types';
import { focusStyle } from '../lib/styles';

import type { DuoyunUseElement } from './use';
import type { RouteItem } from './route';
import { createHistoryParams } from './route';
import type { ContextMenuItem } from './contextmenu';
import { ContextMenu } from './contextmenu';

import './use';

const [elementTheme, updateTheme] = useDecoratorTheme({ bg: '', color: '' });

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    display: inline-flex;
    align-items: stretch;
    line-height: 1.2;
    cursor: default;
    user-select: none;
    font-size: 0.875em;
    border-radius: ${theme.normalRound};
    white-space: nowrap;
  }
  :host(:not([borderless], [disabled])) {
    box-shadow: ${theme.controlShadow};
  }
  :host([round]) {
    border-radius: 10em;
  }
  .content,
  .dropdown {
    position: relative;
    color: ${elementTheme.color};
    background: ${elementTheme.bg};
    border: 1px solid ${elementTheme.bg};
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
  .content.corner {
    border-start-end-radius: 0;
    border-end-end-radius: 0;
  }
  .dropdown {
    display: flex;
    border-radius: inherit;
    border-end-start-radius: 0;
    border-start-start-radius: 0;
    margin-inline-start: -1px;
    padding-inline: 0.2em;
    width: 1.4em;
  }
  .icon {
    width: 1.2em;
  }
  :host([small]) {
    font-size: 0.75em;
  }
  :host([small]) .content {
    min-width: auto;
    padding: 0.5em 0.8em;
  }
  :host([small]) .content {
    min-width: auto;
    padding: 0.5em 0.8em;
  }
  :host([square]) .content {
    min-width: auto;
    padding: 0.5em;
  }
  :host([type='reverse']) :where(.content, .dropdown) {
    color: ${elementTheme.bg};
    border-color: ${elementTheme.bg};
    background: transparent;
  }
  :host([borderless]) :where(.content, .dropdown) {
    border-color: transparent;
  }
  :host([disabled]) {
    cursor: not-allowed;
  }
  :where(:host(:state(active)) .content, .content:where(:hover), .dropdown:where(:hover, :state(active)))::after {
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
`);

/**
 * @customElement dy-button
 * @attr type
 * @attr color
 * @attr small
 * @attr disabled
 */
@customElement('dy-button')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
@connectStore(icons)
@shadow({ delegatesFocus: true })
export class DuoyunButtonElement extends GemElement {
  @slot static unnamed: string;

  @part static button: string;
  @part static dropdown: string;

  @attribute type: 'solid' | 'reverse';
  @attribute color: StringList<'normal' | 'danger' | 'cancel'>;
  @boolattribute small: boolean;
  @boolattribute round: boolean;
  @boolattribute square: boolean;
  @boolattribute disabled: boolean;
  @boolattribute borderless: boolean;

  @property dropdown?: ContextMenuItem[] | null;
  @property route?: RouteItem;
  @property params?: Record<string, string>;
  @property query?: Record<string, string>;
  @property icon?: string | Element | DocumentFragment;
  @state active: boolean;

  #dropdownRef = createRef<DuoyunUseElement>();

  get #color() {
    return getSemanticColor(this.color) || this.color || theme.primaryColor;
  }

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

  #onClickDropdown = async (e: MouseEvent) => {
    e.stopPropagation();
    if (this.disabled) return;
    if (this.dropdown) {
      const { element } = this.#dropdownRef;
      const { right, bottom } = element!.getBoundingClientRect();
      const { width } = this.getBoundingClientRect();
      element!.active = true;
      await ContextMenu.open(this.dropdown, {
        x: right - width,
        y: bottom,
        width: `${width}px`,
      });
      element!.active = false;
    }
  };

  @mounted()
  #init = () => addListener(this, 'click', this.#onClick);

  @updateTheme()
  #theme = () => {
    if (this.disabled) return { bg: theme.disabledColor, color: theme.backgroundColor };
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
        class=${classMap({ content: true, corner: !!this.dropdown })}
        part=${DuoyunButtonElement.button}
      >
        ${this.icon ? html`<dy-use class="icon" .element=${this.icon}></dy-use>` : ''}
        <slot></slot>
      </div>
      ${this.dropdown
        ? html`
            <dy-use
              ref=${this.#dropdownRef.ref}
              class="dropdown"
              part=${DuoyunButtonElement.dropdown}
              @keydown=${commonHandle}
              role="button"
              tabindex=${-Number(this.disabled)}
              aria-disabled=${this.disabled}
              @click=${this.#onClickDropdown}
              .element=${icons.expand}
            ></dy-use>
          `
        : ''}
    `;
  };
}
