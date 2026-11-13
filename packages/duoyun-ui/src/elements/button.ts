import { adoptedStyle, connectStore, customElement, part, property } from '@mantou/gem/lib/decorators';
import { createRef, css, html, type Metadata } from '@mantou/gem/lib/element';
import { buttonTheme, TapButtonElement } from '@mantou/tap-ui/elements/button';
import type { TapUseElement } from '@mantou/tap-ui/elements/use';

import { commonHandle } from '../lib/hotkeys';
import { icons } from '../lib/icons';
import type { ContextMenuItem } from './contextmenu';
import { ContextMenu } from './contextmenu';

import '@mantou/tap-ui/elements/use';

const style = css`
  :host,
  :host([small]) {
    height: auto;
  }
`;

// 让 tap-button 样式等于 dy-button
(TapButtonElement[Symbol.metadata] as Metadata).adoptedStyleSheets?.push(style);

const dropdownStyle = css`
  .content.corner {
    border-start-end-radius: 0;
    border-end-end-radius: 0;
  }
  .dropdown {
    position: relative;
    display: flex;
    color: ${buttonTheme.color};
    background: ${buttonTheme.bg};
    border: 1px solid ${buttonTheme.bg};
    border-radius: inherit;
    border-end-start-radius: 0;
    border-start-start-radius: 0;
    margin-inline-start: -1px;
    padding-inline: 0.2em;
    width: 1.4em;
  }
  :host([type='reverse']) .dropdown {
    color: ${buttonTheme.bg};
    border-color: ${buttonTheme.bg};
    background: transparent;
  }
  :host([borderless]) .dropdown {
    border-color: transparent;
  }
  .dropdown:where(:hover, :state(active))::after {
    content: '';
    position: absolute;
    inset: -1px;
    background-color: currentColor;
    border-radius: inherit;
    opacity: 0.1;
    transition: opacity 0.1s;
  }
  :host([disabled]) .dropdown::after {
    content: none;
  }
`;

/**
 * `tap-button` with a dropdown menu, a desktop feature
 */
@customElement('dy-button')
@adoptedStyle(style)
@adoptedStyle(dropdownStyle)
@connectStore(icons)
export class DuoyunButtonElement extends TapButtonElement {
  @part static dropdown: string;

  @property dropdown?: ContextMenuItem[] | null;

  #dropdownRef = createRef<TapUseElement>();

  #onClickDropdown = async (e: MouseEvent) => {
    e.stopPropagation();
    if (this.disabled || !this.dropdown) return;
    const { value: element } = this.#dropdownRef;
    const { right, bottom } = element!.getBoundingClientRect();
    const { width } = this.getBoundingClientRect();
    element!.active = true;
    await ContextMenu.open(this.dropdown, { x: right - width, y: bottom, width: `${width}px` });
    element!.active = false;
  };

  render = () => {
    return html`
      <div
        role="button"
        tabindex=${-Number(this.disabled)}
        aria-disabled=${this.disabled}
        @keydown=${commonHandle}
        class=${this.dropdown ? 'content corner' : 'content'}
        part=${TapButtonElement.button}
      >
        <tap-use v-if=${!!this.icon} class="icon" .element=${this.icon}></tap-use>
        <slot></slot>
      </div>
      <tap-use
        ${this.#dropdownRef}
        v-if=${!!this.dropdown}
        class="dropdown"
        part=${DuoyunButtonElement.dropdown}
        @keydown=${commonHandle}
        role="button"
        tabindex=${-Number(this.disabled)}
        aria-disabled=${this.disabled}
        @click=${this.#onClickDropdown}
        .element=${icons.expand}
      ></tap-use>
    `;
  };
}
