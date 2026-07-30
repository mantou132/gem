import { adoptedStyle, customElement, part, property, template } from '@mantou/gem/lib/decorators';
import { createRef, css, html } from '@mantou/gem/lib/element';
import { buttonTheme, TapButtonElement } from 'tap-ui/elements/button';

import { commonHandle } from '../lib/hotkeys';
import { icons } from '../lib/icons';
import type { ContextMenuItem } from './contextmenu';
import { ContextMenu } from './contextmenu';
import type { DuoyunUseElement } from './use';

import './use';

const style = css`
  *:has(+ .dropdown) {
    border-start-end-radius: 0;
    border-end-end-radius: 0;
  }
  .dropdown {
    position: relative;
    display: flex;
    border-radius: inherit;
    border-end-start-radius: 0;
    border-start-start-radius: 0;
    margin-inline-start: -1px;
    padding-inline: 0.2em;
    width: 1.4em;
    color: ${buttonTheme.color};
    background: ${buttonTheme.bg};
    border: 1px solid ${buttonTheme.bg};
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
`;

@customElement('dy-button')
@adoptedStyle(style)
export class DuoyunButtonElement extends TapButtonElement {
  @part static dropdown: string;

  @property dropdown?: ContextMenuItem[] | null;

  #dropdownRef = createRef<DuoyunUseElement>();

  #onClickDropdown = async (e: MouseEvent) => {
    e.stopPropagation();
    if (this.disabled) return;
    if (this.dropdown) {
      const { value: element } = this.#dropdownRef;
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

  @template()
  #render = () => {
    return html`
      ${super.renderButtonTemplate()}
      <dy-use
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
      ></dy-use>
    `;
  };
}
