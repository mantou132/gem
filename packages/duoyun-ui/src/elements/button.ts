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
} from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css, QueryString } from '@mantou/gem/lib/utils';
import { createHistoryParams, RouteItem } from '@mantou/gem/elements/route';
import { GemUseElement } from '@mantou/gem/elements/use';

import { theme, getSemanticColor } from '../lib/theme';
import { icons } from '../lib/icons';
import { commonHandle } from '../lib/hotkeys';
import { StringList } from '../lib/types';
import { focusStyle } from '../lib/styles';

import { MenuItem, ContextMenu } from './menu';

const style = createCSSSheet(css`
  :host([hidden]) {
    display: none;
  }
  :host {
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
  .content,
  .dropdown {
    position: relative;
    color: var(--color);
    background: var(--bg);
    border: 1px solid var(--bg);
  }
  .content {
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
    border-radius: 0 ${theme.normalRound} ${theme.normalRound} 0;
    margin-inline-start: -0.6em;
    padding-inline: 0.2em;
    width: 1.4em;
  }
  .icon {
    width: 1.2em;
  }
  :host([small]) {
    font-size: 0.75em;
  }
  :host([small]) :where(.content, .dropdown) {
    min-width: auto;
    padding: 0.5em 0.8em;
  }
  :host([type='reverse']) :where(.content, .dropdown) {
    color: var(--bg);
    border-color: var(--bg);
    background: transparent;
  }
  :host([color='normal']) {
    --bg: ${theme.primaryColor};
  }
  :host([color='danger']) {
    --bg: ${theme.negativeColor};
  }
  :host([color='cancel']) {
    --bg: ${theme.hoverBackgroundColor};
    --color: ${theme.textColor};
  }
  :host([disabled]) {
    cursor: not-allowed;
    --bg: ${theme.disabledColor};
  }
  :where(:host(:where(:--active, [data-active]))
      .content, .content:where(:hover), .dropdown:where(:hover, :--active, [data-active]))::after {
    content: '';
    position: absolute;
    inset: -1px;
    background-color: currentColor;
    border-radius: inherit;
    opacity: 0.1;
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
export class DuoyunButtonElement extends GemElement {
  @attribute type: 'solid' | 'reverse';
  @attribute color: StringList<'normal' | 'danger' | 'cancel'>;
  @boolattribute small: boolean;
  @boolattribute disabled: boolean;

  @property dropdown?: MenuItem[] | null;
  @property route?: RouteItem;
  @property params?: Record<string, string>;
  @property query?: Record<string, string>;
  @property icon?: string | Element | DocumentFragment;
  @state active: boolean;

  @refobject dropdownRef: RefObject<GemUseElement>;
  @refobject buttonRef: RefObject<HTMLDivElement>;

  get #color() {
    return getSemanticColor(this.color) || theme.primaryColor;
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
        ref=${this.buttonRef.ref}
        tabindex="0"
        role="button"
        aria-disabled=${this.disabled}
        @keydown=${commonHandle}
        class="content"
      >
        ${this.icon ? html`<gem-use class="icon" .element=${this.icon}></gem-use>` : ''}
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
            <gem-use
              ref=${this.dropdownRef.ref}
              class="dropdown"
              tabindex="0"
              @keydown=${commonHandle}
              role="button"
              aria-disabled=${this.disabled}
              @click=${this.#onClickDropdown}
              .element=${icons.expand}
            ></gem-use>
          `
        : ''}
    `;
  };

  focus = () => {
    this.buttonRef.element!.focus();
  };
}