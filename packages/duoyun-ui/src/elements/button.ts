import {
  connectStore,
  adoptedStyle,
  customElement,
  attribute,
  property,
  boolattribute,
  refobject,
  RefObject,
  state,
  part,
  slot,
  shadow,
} from '@mantou/gem/lib/decorators';
import { createCSSSheet, GemElement, html } from '@mantou/gem/lib/element';
import { history } from '@mantou/gem/lib/history';
import { css, QueryString } from '@mantou/gem/lib/utils';

import { theme, getSemanticColor } from '../lib/theme';
import { icons } from '../lib/icons';
import { commonHandle } from '../lib/hotkeys';
import { StringList } from '../lib/types';
import { focusStyle } from '../lib/styles';

import type { DuoyunUseElement } from './use';
import { createHistoryParams, RouteItem } from './route';
import { ContextMenuItem, ContextMenu } from './contextmenu';

import './use';

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    --color: ${theme.backgroundColor};
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
    color: var(--color);
    background: var(--bg);
    border: 1px solid var(--bg);
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
    color: var(--bg);
    border-color: var(--bg);
    background: transparent;
  }
  :host([borderless]) :where(.content, .dropdown) {
    border-color: transparent;
  }
  :host([color='normal']) {
    --bg: ${theme.primaryColor};
  }
  :host([color='danger']) {
    --bg: ${theme.negativeColor};
  }
  :host([color='cancel']:not([disabled])) {
    --bg: ${theme.hoverBackgroundColor};
    --color: ${theme.textColor};
  }
  :host([disabled]) {
    cursor: not-allowed;
    --bg: ${theme.disabledColor};
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

  @refobject dropdownRef: RefObject<DuoyunUseElement>;

  @part static button: string;
  @part static dropdown: string;

  get #color() {
    return getSemanticColor(this.color) || this.color || theme.primaryColor;
  }

  constructor() {
    super();
    this.addEventListener('click', () => {
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
    });
  }

  #onClickDropdown = async (e: MouseEvent) => {
    e.stopPropagation();
    if (this.disabled) return;
    if (this.dropdown) {
      const { element } = this.dropdownRef;
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

  render = () => {
    return html`
      <style>
        :host {
          --bg: ${this.#color};
        }
      </style>
      <div
        role="button"
        tabindex=${-Number(this.disabled)}
        aria-disabled=${this.disabled}
        @keydown=${commonHandle}
        class="content"
        part=${DuoyunButtonElement.button}
      >
        ${this.icon ? html`<dy-use class="icon" .element=${this.icon}></dy-use>` : ''}
        <slot></slot>
      </div>
      ${this.dropdown
        ? html`
            <style>
              div.content {
                border-start-end-radius: 0;
                border-end-end-radius: 0;
              }
              span.dropdown {
                border-start-start-radius: 0;
                border-end-start-radius: 0;
              }
            </style>
            <dy-use
              ref=${this.dropdownRef.ref}
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
