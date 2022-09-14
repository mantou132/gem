import { connectStore, adoptedStyle, customElement } from '@mantou/gem/lib/decorators';
import { GemElement, html, TemplateResult } from '@mantou/gem/lib/element';
import { createCSSSheet, css, styleMap } from '@mantou/gem/lib/utils';
import { createStore, updateStore } from '@mantou/gem/lib/store';

import { icons } from '../lib/icons';
import { locale } from '../lib/locale';
import { setBodyInert } from '../lib/utils';
import { hotkeys } from '../lib/hotkeys';
import { theme } from '../lib/theme';

import './compartment';
import './button';
import './options';

export type Menu = MenuItem[] | TemplateResult;
export interface MenuItem {
  /**`---` is separator */
  text: string | TemplateResult;
  description?: string | TemplateResult;
  tag?: string | TemplateResult;
  tagIcon?: string | DocumentFragment | Element;
  disabled?: boolean;
  danger?: boolean;
  selected?: boolean;
  handle?: () => void | Promise<void>;
  menu?: Menu;
}

type MenuStore = {
  // support `auto`
  width?: string;
  maxHeight?: string;
  activeElement?: HTMLElement | null;
  openLeft?: boolean;
  menuStack: {
    searchable?: boolean;
    openTop?: boolean;
    menu: Menu;
    x: number;
    y: number;
    header?: TemplateResult;
  }[];
};

type OpenMenuOptions = {
  /**auto calc `x`/`y` via `activeElement` */
  activeElement?: HTMLElement | null;
  /**only work `activeElement`, only support first menu   */
  openLeft?: boolean;
  /**only work nothing `activeElement`  */
  x?: number;
  /**only work nothing `activeElement`  */
  y?: number;
  /**work on all menu */
  width?: string;
  /**only support first menu */
  maxHeight?: string;
  /**only support first menu */
  searchable?: boolean;
  /**only support first menu */
  header?: TemplateResult;
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
    z-index: ${theme.popupZIndex};
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
    box-sizing: border-box;
    box-shadow: 0 0.3em 1em rgba(0, 0, 0, calc(${theme.maskAlpha} - 0.1));
    scrollbar-width: none;
  }
  .menu::-webkit-scrollbar {
    width: 0;
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
    const { activeElement, openLeft, x = 0, y = 0, width, maxHeight, searchable, header } = options;
    if (Array.isArray(menu) && menu.length === 0) throw new Error('menu length is 0');
    toggleActiveState(activeElement, true);
    updateStore(menuStore, {
      width,
      maxHeight,
      activeElement,
      openLeft,
      menuStack: [{ x, y, menu, searchable, header }],
    });
    if (ContextMenu.instance) {
      await ContextMenu.instance.#initPosition();
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
    const { menuStack, openLeft } = menuStore;
    if (subMenu) {
      const itemEle = evt.currentTarget as HTMLDivElement;
      const { left, right, top, bottom, width } = itemEle.getBoundingClientRect();
      const em = parseFloat(getComputedStyle(this).fontSize);
      const expectX = right - 0.75 * em;
      const expectY = top - 0.4 * em;
      const openTop = expectY > innerHeight - 150;
      const isToLeft =
        (right + width > innerWidth ||
          openLeft ||
          (menuStackIndex > 0 && menuStack[menuStackIndex].x < menuStack[menuStackIndex - 1].x)) &&
        left > 300;
      updateStore(menuStore, {
        menuStack: [
          ...menuStack.slice(0, menuStackIndex + 1),
          {
            openTop,
            x: isToLeft ? left - width + 0.75 * em : expectX,
            y: openTop ? innerHeight - bottom - 0.4 * em : expectY,
            menu: subMenu,
          },
        ],
      });
    } else {
      updateStore(menuStore, {
        menuStack: menuStack.slice(0, menuStackIndex + 1),
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
    evt.stopPropagation();
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

  #preventDefault = (evt: Event) => {
    evt.preventDefault();
  };

  #initPosition = async () => {
    // await `ContextMenu` content update
    await Promise.resolve();
    const element = this.#menuEles.shift();
    const { activeElement, openLeft, menuStack, maxHeight } = menuStore;
    const { scrollHeight, clientHeight, clientWidth } = element!;
    const menu = menuStack[0];
    const height = scrollHeight + 2;
    const width = clientWidth + 2;
    if (activeElement) {
      const { left, right, top, bottom } = activeElement.getBoundingClientRect();
      const showToLeft = openLeft ? left > width + this.#offset : innerWidth - left < width + this.#offset;
      const showToTop = innerHeight - bottom < height + 2 * this.#offset && top > innerHeight - bottom;
      const x = showToLeft ? right - width : left;
      const y = showToTop ? Math.max(top - height - 2 * this.#offset, 0) : bottom;
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
    this.addEventListener('contextmenu', this.#preventDefault);
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
        (
          { x, y, menu, searchable, openTop, header },
          index,
          _,
          calcWidth = this.#width === 'auto' ? '0px' : this.#width,
        ) => html`
          <dy-options
            class="menu"
            style=${styleMap({
              width: this.#width,
              maxHeight: openTop
                ? '20em'
                : maxHeight && index === 0
                ? `${maxHeight}`
                : `calc(100vh - 0.8em - ${y - this.#offset}px)`,
              [openTop ? 'bottom' : 'top']: `${y + this.#offset}px`,
              left: `min(${x}px, calc(100vw - ${calcWidth} - ${2 * this.#offset}px))`,
            })}
            @keydown=${(evt: KeyboardEvent) => this.#onKeydown(evt, index)}
            ?searchable=${searchable}
            .options=${Array.isArray(menu)
              ? menu.map(
                  (
                    { text, description, tag, tagIcon, handle, disabled, selected, danger, menu: subMenu },
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
                    tagIcon: subMenu ? icons.right : selected ? icons.check : tagIcon,
                    onClick: subMenu ? onPointerEnter : onClick,
                    onPointerEnter,
                  }),
                )
              : undefined}
          >
            ${Array.isArray(menu)
              ? header
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
