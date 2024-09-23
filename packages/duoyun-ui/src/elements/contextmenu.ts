import { connectStore, adoptedStyle, customElement, shadow, effect, mounted } from '@mantou/gem/lib/decorators';
import type { TemplateResult } from '@mantou/gem/lib/element';
import { createCSSSheet, html, GemElement, createRef } from '@mantou/gem/lib/element';
import { css, styleMap, classMap } from '@mantou/gem/lib/utils';
import { createStore } from '@mantou/gem/lib/store';

import { icons } from '../lib/icons';
import { locale } from '../lib/locale';
import { setBodyInert, toggleActiveState } from '../lib/element';
import { hotkeys } from '../lib/hotkeys';
import { theme } from '../lib/theme';

import type { DuoyunOptionsElement } from './options';

import './compartment';
import './button';

export { SEPARATOR } from './options';

type Menu = ContextMenuItem[] | TemplateResult;
type MenuOptions = {
  /**support `auto`, inherit */
  width?: string;
  maxHeight?: string;
  header?: TemplateResult;
  searchable?: boolean;
};
type MenuObject = MenuOptions & { menu: Menu };
export type MenuOrMenuObject = Menu | MenuObject;

export interface ContextMenuItem {
  text: string | TemplateResult;
  description?: string | TemplateResult;
  tag?: string | TemplateResult;
  tagIcon?: string | DocumentFragment | Element;
  disabled?: boolean;
  danger?: boolean;
  selected?: boolean;
  handle?: () => void | Promise<void>;
  menu?: MenuOrMenuObject;
}

type ContextMenuStore = {
  activeElement?: HTMLElement | null;
  onlyActive?: boolean;
  openLeft?: boolean;
  maskClosable?: boolean;
  menuStack: (MenuOptions & {
    openTop?: boolean;
    menu: Menu;
    x: number;
    y: number;
    causeEle?: HTMLDivElement;
    causeMask?: TemplateResult;
  })[];
};

const contextmenuStore = createStore<ContextMenuStore>({
  menuStack: [],
});

type ContextMenuOptions = MenuOptions & {
  /**auto calc `x`/`y` via `activeElement` */
  activeElement?: HTMLElement | null;
  /**priority is higher than `activeElement`  */
  x?: number;
  y?: number;
  /**only work `activeElement`, only support first menu   */
  openLeft?: boolean;
  maskClosable?: boolean;
};

function getMenuObject(menuOrMenuObject: MenuOrMenuObject) {
  if ('menu' in menuOrMenuObject) {
    return menuOrMenuObject;
  } else {
    return { menu: menuOrMenuObject };
  }
}

let closeResolve: (value?: any) => void;

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    display: block;
    position: fixed;
    z-index: calc(${theme.popupZIndex} + 2);
    inset: 0;
    top: env(titlebar-area-height, var(--titlebar-area-height, 0px));
    font-size: 0.875em;
    cursor: default;
    user-select: none;
  }
  .mask {
    position: absolute;
    inset: 0;
  }
  .opaque {
    background: rgba(0, 0, 0, ${theme.maskAlpha});
  }
  .menu-custom-container {
    padding: 0.4em 1em;
  }
  .menu {
    outline: none;
    position: fixed;
    font-size: 1em;
    box-sizing: border-box;
    box-shadow: 0 7px 14px rgba(0, 0, 0, calc(${theme.maskAlpha} - 0.1));
    scrollbar-width: none;
  }
`);

/**
 * @customElement dy-contextmenu
 */
@customElement('dy-contextmenu')
@connectStore(contextmenuStore)
@adoptedStyle(style)
@shadow({ delegatesFocus: true })
export class DuoyunContextmenuElement extends GemElement {
  static instance?: DuoyunContextmenuElement;

  static async open(contextmenu: MenuOrMenuObject, options: ContextMenuOptions = {}) {
    if (Array.isArray(contextmenu) && contextmenu.length === 0) throw new Error('menu length is 0');
    const { activeElement, openLeft, x = 0, y = 0, maskClosable = true } = options;
    const menuObject = getMenuObject(contextmenu);
    const menu = menuObject.menu;
    const header = menuObject.header || options.header;
    const width = menuObject.width || options.width;
    const maxHeight = menuObject.maxHeight || options.maxHeight;
    const searchable = menuObject.searchable || options.searchable;
    toggleActiveState(activeElement, true);
    contextmenuStore({
      activeElement,
      onlyActive: !!x || !!y,
      openLeft,
      maskClosable,
      menuStack: [{ x, y, menu, searchable, header, width, maxHeight }],
    });
    if (!ContextMenu.instance) {
      const ele = new ContextMenu();
      document.body.append(ele);
    }
    await new Promise((res) => (closeResolve = res));
  }

  static async confirm(
    text: string | TemplateResult,
    options: ContextMenuOptions & { danger?: boolean; okText?: string | TemplateResult },
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
    toggleActiveState(contextmenuStore.activeElement, false);
    closeResolve();
    ContextMenu.instance.remove();
    // specify keyboard navigation location
    contextmenuStore.activeElement?.focus();
    contextmenuStore.activeElement?.blur();
  }

  #optionsRef = createRef<DuoyunOptionsElement>();

  get #defaultWidth() {
    return contextmenuStore.menuStack[0].width || '15em';
  }

  get #menuElements() {
    return [...this.shadowRoot!.querySelectorAll<HTMLElement>('.menu')];
  }

  #offset = 4;

  #onEnterMenu = (evt: PointerEvent, menuStackIndex: number, subMenu?: MenuOrMenuObject) => {
    const { menuStack, openLeft } = contextmenuStore;
    if (subMenu) {
      const menuObject = getMenuObject(subMenu);
      const causeEle = evt.currentTarget as HTMLDivElement;
      if (causeEle === menuStack.at(menuStackIndex + 1)?.causeEle) return;
      const { left, right, top, bottom, width } = causeEle.getBoundingClientRect();
      const em = parseFloat(getComputedStyle(this).fontSize);
      const expectX = right - 0.75 * em;
      const expectY = top - 0.4 * em;
      const predictSubMenuHeight = 240;
      const openTop = expectY > innerHeight - predictSubMenuHeight;
      const isToLeft =
        (right + width > innerWidth ||
          openLeft ||
          (menuStackIndex > 0 && menuStack[menuStackIndex].x < menuStack[menuStackIndex - 1].x)) &&
        left > 300;
      contextmenuStore({
        menuStack: [
          ...menuStack.slice(0, menuStackIndex + 1),
          {
            causeEle,
            openTop,
            x: isToLeft ? left - width + 0.75 * em : expectX,
            y: openTop ? innerHeight - bottom - 0.4 * em : expectY,
            ...menuObject,
          },
        ],
      });
    } else {
      contextmenuStore({ menuStack: menuStack.slice(0, menuStackIndex + 1) });
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
    hotkeys({
      esc:
        menuStackIndex === 0
          ? ContextMenu.close
          : () => contextmenuStore({ menuStack: contextmenuStore.menuStack.slice(0, menuStackIndex) }),
    })(evt);
  };

  #preventDefault = (evt: Event) => {
    evt.preventDefault();
  };

  #initPosition = () => {
    const element = this.#menuElements.shift();
    const { activeElement, onlyActive, openLeft, menuStack } = contextmenuStore;
    const { scrollHeight, clientHeight, clientWidth } = element!;
    const menu = menuStack[0];
    const height = scrollHeight + 2;
    const width = clientWidth + 2;
    if (activeElement && !onlyActive) {
      const { left, right, top, bottom } = activeElement.getBoundingClientRect();
      const showToLeft = openLeft ? left > width + this.#offset : innerWidth - left < width + this.#offset;
      const showToTop = innerHeight - bottom < height + 2 * this.#offset && top > innerHeight - bottom;
      const x = showToLeft ? right - width : left;
      const y = showToTop ? Math.max(top - height - 2 * this.#offset, 0) : bottom;
      contextmenuStore({
        menuStack: [
          {
            ...menu,
            x,
            y,
            maxHeight:
              menu.maxHeight || `${showToTop ? top - 2 * this.#offset : innerHeight - bottom - 2 * this.#offset}px`,
          },
        ],
      });
    } else {
      const y = innerHeight - menu.y > width ? menu.y : Math.max(0, menu.y - (scrollHeight - clientHeight));
      contextmenuStore({ menuStack: [{ ...menu, y }] });
    }
  };

  #onMaskClick = () => {
    if (contextmenuStore.maskClosable) {
      ContextMenu.close();
    }
  };

  @mounted()
  #init = () => {
    const restoreInert = setBodyInert(this);
    ContextMenu.instance = this;
    this.addEventListener('contextmenu', this.#preventDefault);
    const ob = new ResizeObserver(this.#initPosition);
    const optionsElement = this.#optionsRef.element;
    if (optionsElement) ob.observe(optionsElement);
    return () => {
      if (optionsElement) ob.disconnect();
      restoreInert();
      ContextMenu.instance = undefined;
    };
  };

  @effect(() => [contextmenuStore.menuStack.length])
  #autoFocus = () => this.#menuElements.at(-1)?.focus();

  @effect(() => [contextmenuStore.menuStack.at(-1)?.menu])
  #genMask = async () => {
    // wait `<dy-options>` update
    await Promise.resolve();
    const causeEle = contextmenuStore.menuStack.at(-1)?.causeEle;
    const optionsEle = this.#optionsRef.elements.at(-1)!;
    if (!causeEle) return;
    const causeEleRect = causeEle.getBoundingClientRect();
    const optionsEleRect = optionsEle.getBoundingClientRect();
    const isRight = optionsEleRect.right > causeEleRect.right;
    const startPointX = isRight ? causeEleRect.right : causeEleRect.left;
    const startPoint = [startPointX + 50 * (isRight ? -1 : 1), (causeEleRect.top + causeEleRect.bottom) / 2];
    const secondPointX = isRight ? optionsEleRect.left : optionsEleRect.right;
    const secondPoint = [secondPointX, optionsEleRect.top];
    const thirdPoint = [secondPointX, optionsEleRect.bottom];
    contextmenuStore.menuStack.at(-1)!.causeMask = html`
      <div
        style=${styleMap({
          // background: 'rgba(0, 0, 0, 0.1)',
          position: 'absolute',
          width: `100vw`,
          height: `100vh`,
          clipPath: `polygon(${[startPoint, secondPoint, thirdPoint].map((point) =>
            point.map((e) => `${e}px`).join(' '),
          )})`,
        })}
      ></div>
    `;
    contextmenuStore();
  };

  render = () => {
    const { menuStack, maskClosable } = contextmenuStore;
    return html`
      <div class=${classMap({ mask: true, opaque: !maskClosable })} @click=${this.#onMaskClick}></div>
      ${menuStack.map(
        (
          { x, y, menu, searchable, openTop, header, causeMask, width, maxHeight },
          index,
          _,
          menuWidth = width || this.#defaultWidth,
          calcWidth = menuWidth === 'auto' ? '0px' : menuWidth,
        ) => html`
          ${causeMask}
          <dy-options
            class="menu"
            ref=${this.#optionsRef.ref}
            style=${styleMap({
              width: menuWidth,
              maxHeight: maxHeight || `calc(100vh - 0.8em - ${y - this.#offset}px)`,
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
                    highlight: subMenu && getMenuObject(subMenu).menu === menuStack[index + 1]?.menu,
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

export const ContextMenu = DuoyunContextmenuElement;
