import { connectStore, adoptedStyle, customElement, refobject, RefObject } from '@mantou/gem/lib/decorators';
import { html, GemElement, TemplateResult } from '@mantou/gem/lib/element';
import { createCSSSheet, css, styleMap, classMap } from '@mantou/gem/lib/utils';
import { useStore } from '@mantou/gem/lib/store';

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
export interface ContextMenuItem {
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

type ContextMenuStore = {
  // support `auto`
  width?: string;
  maxHeight?: string;
  activeElement?: HTMLElement | null;
  onlyActive?: boolean;
  openLeft?: boolean;
  maskClosable?: boolean;
  menuStack: {
    searchable?: boolean;
    openTop?: boolean;
    menu: Menu;
    x: number;
    y: number;
    header?: TemplateResult;
    causeEle?: HTMLDivElement;
    causeMask?: TemplateResult;
  }[];
};

type ContextMenuOptions = {
  /**auto calc `x`/`y` via `activeElement` */
  activeElement?: HTMLElement | null;
  /**only work `activeElement`, only support first menu   */
  openLeft?: boolean;
  maskClosable?: boolean;
  /**priority is higher than `activeElement`  */
  x?: number;
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

const [contextmenuStore, update] = useStore<ContextMenuStore>({
  menuStack: [],
});

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
  .menu::-webkit-scrollbar {
    width: 0;
  }
`);

/**
 * @customElement dy-contextmenu
 */
@customElement('dy-contextmenu')
@connectStore(contextmenuStore)
@adoptedStyle(style)
export class DuoyunContextmenuElement extends GemElement {
  @refobject optionsRef: RefObject<DuoyunOptionsElement>;

  static instance?: DuoyunContextmenuElement;

  static async open(contextmenu: Menu, options: ContextMenuOptions = {}) {
    const {
      activeElement,
      openLeft,
      x = 0,
      y = 0,
      width,
      maxHeight,
      searchable,
      header,
      maskClosable = true,
    } = options;
    if (Array.isArray(contextmenu) && contextmenu.length === 0) throw new Error('menu length is 0');
    toggleActiveState(activeElement, true);
    update({
      width,
      maxHeight,
      activeElement,
      onlyActive: !!x || !!y,
      openLeft,
      maskClosable,
      menuStack: [{ x, y, menu: contextmenu, searchable, header }],
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

  get #width() {
    return contextmenuStore.width || '15em';
  }

  get #menuElements() {
    return [...this.shadowRoot!.querySelectorAll<HTMLElement>('.menu')];
  }

  constructor() {
    super({ delegatesFocus: true });
  }

  #offset = 4;

  #onEnterMenu = (evt: PointerEvent, menuStackIndex: number, subMenu?: Menu) => {
    const { menuStack, openLeft } = contextmenuStore;
    if (subMenu) {
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
      update({
        menuStack: [
          ...menuStack.slice(0, menuStackIndex + 1),
          {
            causeEle,
            openTop,
            x: isToLeft ? left - width + 0.75 * em : expectX,
            y: openTop ? innerHeight - bottom - 0.4 * em : expectY,
            menu: subMenu,
          },
        ],
      });
    } else {
      update({ menuStack: menuStack.slice(0, menuStackIndex + 1) });
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
          : () => update({ menuStack: contextmenuStore.menuStack.slice(0, menuStackIndex) }),
    })(evt);
  };

  #preventDefault = (evt: Event) => {
    evt.preventDefault();
  };

  #initPosition = () => {
    const element = this.#menuElements.shift();
    const { activeElement, onlyActive, openLeft, menuStack, maxHeight } = contextmenuStore;
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
      update({
        maxHeight: maxHeight || `${showToTop ? top - 2 * this.#offset : innerHeight - bottom - 2 * this.#offset}px`,
        menuStack: [{ ...menu, x, y }],
      });
    } else {
      const y = innerHeight - menu.y > width ? menu.y : Math.max(0, menu.y - (scrollHeight - clientHeight));
      update({ menuStack: [{ ...menu, y }] });
    }
  };

  #genMask = async () => {
    // wait `<dy-options>` update
    await Promise.resolve();
    const causeEle = contextmenuStore.menuStack.at(-1)?.causeEle;
    const optionsEle = this.optionsRef.elements.at(-1)!;
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
    update();
  };

  #onMaskClick = () => {
    if (contextmenuStore.maskClosable) {
      ContextMenu.close();
    }
  };

  mounted = () => {
    this.effect(
      () => this.#menuElements.at(-1)?.focus(),
      () => [contextmenuStore.menuStack.length],
    );
    this.effect(
      () => this.#genMask(),
      () => [contextmenuStore.menuStack.at(-1)?.menu],
    );
    const restoreInert = setBodyInert(this);
    ContextMenu.instance = this;
    this.addEventListener('contextmenu', this.#preventDefault);
    const ob = new ResizeObserver(this.#initPosition);
    const optionsElement = this.optionsRef.element;
    if (optionsElement) ob.observe(optionsElement);
    return () => {
      if (optionsElement) ob.disconnect();
      restoreInert();
      ContextMenu.instance = undefined;
    };
  };

  render = () => {
    const { menuStack, maxHeight, maskClosable } = contextmenuStore;
    return html`
      <div class=${classMap({ mask: true, opaque: !maskClosable })} @click=${this.#onMaskClick}></div>
      ${menuStack.map(
        (
          { x, y, menu, searchable, openTop, header, causeMask },
          index,
          _,
          calcWidth = this.#width === 'auto' ? '0px' : this.#width,
        ) => html`
          ${causeMask}
          <dy-options
            class="menu"
            ref=${this.optionsRef.ref}
            style=${styleMap({
              width: this.#width,
              maxHeight: maxHeight && index === 0 ? maxHeight : `calc(100vh - 0.8em - ${y - this.#offset}px)`,
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
                    highlight: subMenu && subMenu === menuStack[index + 1]?.menu,
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
