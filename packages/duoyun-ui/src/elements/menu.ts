import { connectStore, adoptedStyle, customElement } from '@mantou/gem/lib/decorators';
import { GemElement, html, TemplateResult } from '@mantou/gem/lib/element';
import { createCSSSheet, css, styleMap } from '@mantou/gem/lib/utils';
import { createStore, updateStore } from '@mantou/gem/lib/store';

import { icons } from '../lib/icons';
import { locale } from '../lib/locale';
import { setBodyInert } from '../lib/utils';
import { hotkeys } from '../lib/hotkeys';

import './compartment';
import './button';
import './options';

export type Menu = MenuItem[] | TemplateResult;
export interface MenuItem {
  /**`---` is separator */
  text: string | TemplateResult;
  description?: string | TemplateResult;
  tag?: string | TemplateResult;
  disabled?: boolean;
  danger?: boolean;
  selected?: boolean;
  handle?: () => void | Promise<void>;
  menu?: Menu;
}

type MenuStore = {
  width?: string;
  maxHeight?: string;
  activeElement?: HTMLElement | null;
  preferDir?: 'right' | 'left';
  menuStack: {
    searchable?: boolean;
    menu: Menu;
    x: number;
    y: number;
  }[];
};

type OpenMenuOptions = {
  /**auto calc `x`/`y` via `activeElement` */
  activeElement?: HTMLElement | null;
  /**only work `activeElement`, only support first menu   */
  preferDir?: 'right' | 'left';
  /**only work nothing `activeElement`  */
  x?: number;
  /**only work nothing `activeElement`  */
  y?: number;
  width?: string;
  /**only support first menu */
  maxHeight?: string;
  /**only support first menu */
  searchable?: boolean;
};

export const menuStore = createStore<MenuStore>({
  menuStack: [],
});

function toggleActiveState(ele: HTMLElement | undefined | null, active: boolean) {
  if (!ele) return;
  if (ele instanceof GemElement) {
    if ((ele.constructor as typeof GemElement).defineCSSStates?.includes('active')) {
      (ele as any).active = active;
    }
    // button/combobox
    ele.internals.ariaExpanded = String(active);
  }
}

let closeResolve: (value?: any) => void;

const style = createCSSSheet(css`
  :host {
    display: block;
    position: fixed;
    z-index: 99999999;
    inset: 0;
    font-size: 0.875em;
    cursor: default;
    user-select: none;
  }
  .mask {
    position: absolute;
    inset: 0;
  }
  .menu-custom-container {
    padding: 0.4em 1em;
  }
  .menu {
    outline: none;
    position: absolute;
    font-size: 1em;
  }
`);

/**
 * @customElement dy-menu
 */
@customElement('dy-menu')
@connectStore(menuStore)
@adoptedStyle(style)
export class DuoyunMenuElement extends GemElement {
  static instance?: DuoyunMenuElement;

  static async open(menu: Menu, options: OpenMenuOptions = {}) {
    const { activeElement, preferDir, x = 0, y = 0, width, maxHeight, searchable } = options;
    if (Array.isArray(menu) && menu.length === 0) throw new Error('menu length is 0');
    toggleActiveState(activeElement, true);
    updateStore(menuStore, {
      width,
      maxHeight,
      activeElement,
      preferDir,
      menuStack: [{ x, y, menu, searchable }],
    });
    if (ContextMenu.instance) {
      // await `ContextMenu` content update
      await Promise.resolve();
      ContextMenu.instance.#initPosition();
    } else {
      new ContextMenu();
    }
    await new Promise((res) => (closeResolve = res));
  }

  static async confirm(
    text: string | TemplateResult,
    options: OpenMenuOptions & { danger?: boolean; okText?: string | TemplateResult },
  ) {
    return new Promise((res, rej) => {
      const onClick = () => {
        ContextMenu.close();
        res(null);
      };
      ContextMenu.open(
        html`
          <style>
            .confirm-button {
              text-align: right;
              margin-top: 2em;
            }
          </style>
          <div class="confirm-text">${text}</div>
          <div class="confirm-button">
            <dy-button @click=${onClick} .color=${options.danger ? 'danger' : 'normal'}>
              ${options.okText || locale.ok}
            </dy-button>
          </div>
        `,
        options,
      ).then(rej);
    });
  }

  static close() {
    if (!ContextMenu.instance) return;
    toggleActiveState(menuStore.activeElement, false);
    closeResolve();
    ContextMenu.instance.remove();
    // specify keyboard navigation location
    menuStore.activeElement?.focus();
    menuStore.activeElement?.blur();
  }

  get #width() {
    return menuStore.width || '15em';
  }

  get #menuEles() {
    return [...this.shadowRoot!.querySelectorAll<HTMLElement>('.menu')];
  }

  constructor() {
    super();
    document.body.append(this);
  }

  #offset = 4;

  #onEnterMenu = (evt: PointerEvent, menuStackIndex: number, subMenu?: Menu) => {
    if (subMenu) {
      const { left, top, width } = (evt.target as HTMLDivElement).getBoundingClientRect();
      const em = parseFloat(getComputedStyle(this).fontSize);
      const x = left + 2 * width < innerWidth ? left + width - 0.75 * em : left - width + 0.75 * em;
      const y = top - 0.4 * em;
      updateStore(menuStore, {
        menuStack: [...menuStore.menuStack.slice(0, menuStackIndex + 1), { x, y, menu: subMenu }],
      });
    } else {
      updateStore(menuStore, {
        menuStack: menuStore.menuStack.slice(0, menuStackIndex + 1),
      });
    }
  };

  #execHandle = (handle?: () => void) => {
    if (handle) {
      ContextMenu.close();
      handle();
    }
  };

  #onKeydown = (evt: KeyboardEvent, menuStackIndex: number) => {
    const focusPrevMenu = () => {
      updateStore(menuStore, {
        menuStack: menuStore.menuStack.slice(0, menuStackIndex),
      });
      this.#menuEles[menuStackIndex - 1]?.focus();
    };
    hotkeys({
      esc: menuStackIndex === 0 ? ContextMenu.close : focusPrevMenu,
      left: focusPrevMenu,
      right: () => this.#menuEles[menuStackIndex + 1]?.focus(),
    })(evt);
  };

  #initPosition = () => {
    const element = this.#menuEles.shift();
    const { activeElement, preferDir, menuStack, maxHeight } = menuStore;
    const { scrollHeight, clientHeight, clientWidth } = element!;
    const menu = menuStack[0];
    const height = scrollHeight + 2;
    const width = clientWidth + 2;
    if (activeElement) {
      const preferLeft = preferDir === 'left';
      const { left, right, top, bottom } = activeElement.getBoundingClientRect();
      const showToLeft = preferLeft ? left > width + this.#offset : innerWidth - left < width + this.#offset;
      const showToTop = innerHeight - bottom < height + 2 * this.#offset && top > height + 2 * this.#offset;
      const x = showToLeft ? right - width : left;
      const y = showToTop ? top - height - 2 * this.#offset : bottom;
      updateStore(menuStore, {
        maxHeight: maxHeight || `${showToTop ? top - 2 * this.#offset : innerHeight - bottom - 2 * this.#offset}px`,
        menuStack: [{ ...menu, x, y }],
      });
    } else {
      const y = innerHeight - menu.y > width ? menu.y : Math.max(0, menu.y - (scrollHeight - clientHeight));
      updateStore(menuStore, { menuStack: [{ ...menu, y }] });
    }
  };

  mounted = () => {
    this.#initPosition();
    this.#menuEles.shift()?.focus();
    const restoreInert = setBodyInert(this);
    ContextMenu.instance = this;
    return () => {
      restoreInert();
      ContextMenu.instance = undefined;
    };
  };

  render = () => {
    const { menuStack, maxHeight } = menuStore;
    return html`
      <div class="mask" @click=${ContextMenu.close}></div>
      ${menuStack.map(
        ({ x, y, menu, searchable }, index, _, calcWidth = this.#width === 'auto' ? '0px' : this.#width) => html`
          <dy-options
            class="menu"
            style=${styleMap({
              width: this.#width,
              maxHeight: maxHeight && index === 0 ? `${maxHeight}` : `calc(100vh - 0.8em - ${y + 2 * this.#offset}px)`,
              top: `${y + this.#offset}px`,
              left: `min(${x}px, calc(100vw - ${calcWidth} - ${2 * this.#offset}px))`,
            })}
            @keydown=${(evt: KeyboardEvent) => this.#onKeydown(evt, index)}
            ?searchable=${searchable}
            .options=${Array.isArray(menu)
              ? menu.map(
                  (
                    { text, description, tag, handle, disabled, selected, danger, menu: subMenu },
                    _index,
                    __arr,
                    onPointerEnter = (evt: PointerEvent) => this.#onEnterMenu(evt, index, subMenu),
                    onClick = !disabled ? (_evt: PointerEvent) => this.#execHandle(handle) : undefined,
                  ) => ({
                    label: text,
                    description,
                    tag,
                    disabled,
                    danger,
                    highlight: !!(subMenu && subMenu === menuStack[index + 1]?.menu),
                    icon: subMenu ? icons.right : selected ? icons.check : undefined,
                    onClick: subMenu ? onPointerEnter : onClick,
                    onPointerEnter,
                  }),
                )
              : undefined}
          >
            ${Array.isArray(menu)
              ? ''
              : html`
                  <div class="menu-custom-container">
                    <dy-compartment .content=${menu}></dy-compartment>
                  </div>
                `}
          </dy-options>
        `,
      )}
    `;
  };
}

export const ContextMenu = DuoyunMenuElement;
