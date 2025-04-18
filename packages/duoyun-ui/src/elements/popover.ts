import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  attribute,
  boolattribute,
  customElement,
  effect,
  emitter,
  mounted,
  part,
  property,
  shadow,
} from '@mantou/gem/lib/decorators';
import type { TemplateResult } from '@mantou/gem/lib/element';
import { createRef, createState, css, GemElement, html } from '@mantou/gem/lib/element';
import type { StyleObject } from '@mantou/gem/lib/utils';
import { addListener, styleMap } from '@mantou/gem/lib/utils';

import { getBoundingClientRect, setBodyInert, toggleActiveState } from '../lib/element';
import { hotkeys } from '../lib/hotkeys';
import { contentsContainer } from '../lib/styles';
import { theme } from '../lib/theme';
import { sleep } from '../lib/timer';

import './reflect';

const offset = 12;

type Position = 'top' | 'bottom' | 'right' | 'left' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

type GhostStyle = {
  '--bg': string;
  '--color': string;
} & StyleObject;

type PopoverOptions = {
  delay?: number;
  unreachable?: boolean;
  content?: string | TemplateResult;
  position?: Position;
  ghostStyle?: GhostStyle;
  // `click` close
  trigger?: 'click' | 'hover';
};

type CloseCallback = {
  (): void;
  instance: DuoyunPopoverElement;
};

@customElement('dy-popover')
@adoptedStyle(contentsContainer)
@shadow({ delegatesFocus: true })
export class DuoyunPopoverElement extends GemElement {
  // 用于非继承样式通过 `inherit` 继承
  @part static slot: string;

  @boolattribute debug: boolean;
  @boolattribute unreachable: boolean;
  @boolattribute disabled: boolean;
  @attribute trigger: 'click' | 'hover';
  @attribute position: Position | 'auto';

  // 不能通过 slot 元素支持
  @property content?: string | TemplateResult;

  @emitter open: Emitter<null>;
  @emitter close: Emitter<null>;

  static open(e: Element, option: PopoverOptions): CloseCallback;
  static open(x: number, y: number, option: PopoverOptions): CloseCallback;
  static open(xywh: number[], option: PopoverOptions): CloseCallback;
  static open(...args: any[]) {
    const firstArg = args[0];
    const options = args.pop();
    const element = firstArg instanceof Element ? firstArg : null;
    const { left, right, top, bottom } = element
      ? element.getBoundingClientRect()
      : Array.isArray(firstArg)
        ? { left: firstArg[0], right: firstArg[0] + firstArg[2], top: firstArg[1], bottom: firstArg[1] + firstArg[3] }
        : { left: firstArg, right: firstArg, top: args[1], bottom: args[1] };

    toggleActiveState(element, true);
    const popover = new DuoyunPopoverElement(options);
    const restoreInert = options.trigger === 'click' ? setBodyInert(popover) : undefined;
    popover.#open({ left, right, top, bottom });
    document.body.append(popover);
    // handle mask click
    popover.addEventListener('close', () => {
      restoreInert?.();
      popover.remove();
      toggleActiveState(element, false);
    });
    const callback = () => {
      restoreInert?.();
      popover.close(null);
      popover.remove();
      toggleActiveState(element, false);
    };
    callback.instance = popover;
    return callback;
  }

  static ghostStyle: GhostStyle = {
    '--bg': theme.backgroundColor,
    '--color': theme.textColor,
  };

  #popoverRef = createRef<DuoyunPopoverGhostElement>();
  #slotRef = createRef<HTMLSlotElement>();

  get #position() {
    return this.position || 'auto';
  }

  get #trigger() {
    return this.trigger || 'hover';
  }

  get #isClickTrigger() {
    return this.#trigger === 'click';
  }

  get #role() {
    return this.tagName.includes('TOOLTIP') ? 'tooltip' : 'region';
  }

  #state = createState({
    open: false,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    style: {} as StyleObject,
    position: 'top' as Position,
  });

  #hover = false;

  constructor(options: PopoverOptions = {}) {
    super();
    const { delay = 500, content, position, ghostStyle, trigger, unreachable } = options;
    if (content) this.content = content;
    if (position) this.position = position;
    if (ghostStyle) this.ghostStyle = ghostStyle;
    if (trigger) this.trigger = trigger;
    if (unreachable) this.unreachable = unreachable;
    this.addEventListener('mouseenter', async () => {
      if (this.#isClickTrigger) return;
      this.#hover = true;
      await sleep(delay);
      if (!this.content) return;
      if (!this.#hover) return;
      this.#open();
    });

    this.addEventListener('mouseleave', (evt) => {
      if (this.#isClickTrigger) return;
      this.#hover = false;
      if (evt.relatedTarget === this.popoverElement) return;
      this.#close();
    });

    this.addEventListener('click', () => {
      if (this.#isClickTrigger) {
        this.#open();
      }
    });
  }

  get popoverElement() {
    return this.#popoverRef.value;
  }

  #open = (targetRect?: { top: number; right: number; bottom: number; left: number }) => {
    if (this.disabled) return;
    if (this.#state.open) return;
    let rect = targetRect;
    if (!rect) {
      // self is `display: contents`
      let elements = this.#slotRef.value!.assignedElements({ flatten: true });
      if (!elements.length) {
        elements = [this];
        this.style.display = 'inline';
      } else {
        this.removeAttribute('style');
      }
      rect = getBoundingClientRect(elements);
    }
    const { top, right, bottom, left } = rect;
    this.#state({
      open: true,
      top,
      left,
      right,
      bottom,
    });
    const position = this.#position === 'auto' ? 'top' : this.#position;
    this.#state({
      position,
      style: this.#genStyle(position),
    });
    this.open(null);
  };

  #close = () => {
    if (!this.#state.open) return;
    this.#state({ open: this.debug || false });
    if (!this.#state.open) this.close(null);
  };

  #genStyle = (position: Position): StyleObject => {
    const { top, left, right, bottom } = this.#state;
    const widthHalf = (right - left) / 2;
    const heightHalf = (top - bottom) / 2;
    switch (position) {
      case 'top':
        return {
          left: `${left + widthHalf}px`,
          bottom: `${innerHeight - top + offset}px`,
          transform: `translateX(-50%)`,
        };
      case 'bottom':
        return {
          left: `${left + widthHalf}px`,
          top: `${bottom + offset}px`,
          transform: `translateX(-50%)`,
        };
      case 'left':
        return {
          right: `${innerWidth - left + offset}px`,
          top: `${top - heightHalf}px`,
          transform: `translateY(-50%)`,
        };
      case 'right':
        return {
          left: `${right + offset}px`,
          top: `${top - heightHalf}px`,
          transform: `translateY(-50%)`,
        };
      case 'bottomRight':
        return {
          right: `${innerWidth - right}px`,
          top: `${bottom + offset}px`,
          '--arrow-offset': `min(2em, ${widthHalf}px)`,
        };
      case 'topRight':
        return {
          right: `${innerWidth - right}px`,
          bottom: `${innerHeight - top + offset}px`,
          '--arrow-offset': `min(2em, ${widthHalf}px)`,
        };
      case 'bottomLeft':
        return {
          left: `${left}px`,
          top: `${bottom + offset}px`,
          '--arrow-offset': `min(2em, ${widthHalf}px)`,
        };
      case 'topLeft':
        return {
          left: `${left}px`,
          bottom: `${innerHeight - top + offset}px`,
          '--arrow-offset': `min(2em, ${widthHalf}px)`,
        };
    }
  };

  @effect((i) => [i.#state.open])
  #updateState = () => {
    if (!this.#state.open || this.#position !== 'auto') return;
    const { top, left, right, bottom, height } = this.popoverElement!.getBoundingClientRect();
    let position: Position = 'top';
    if (right > innerWidth) {
      if (top < 0) {
        position = 'bottomRight';
      } else if (innerHeight - bottom < height / 2) {
        position = 'topRight';
      } else {
        position = 'left';
      }
    } else if (left < 0) {
      if (top < 0) {
        position = 'bottomLeft';
      } else if (innerHeight - bottom < height / 2) {
        position = 'topLeft';
      } else {
        position = 'right';
      }
    } else if (top < 0) {
      position = 'bottom';
    }
    this.#state({ style: this.#genStyle(position), position });
  };

  render = () => {
    const { open, style, position } = this.#state;
    return html`
      ${
        !open
          ? null
          : html`
            <dy-reflect v-if=${open} .target=${document.body}>
              <div
                style=${styleMap({
                  display: this.#isClickTrigger ? 'block' : 'none',
                  position: 'fixed',
                  zIndex: theme.popupZIndex,
                  inset: 0,
                })}
                @pointerup=${
                  // `pointerup` 防止指针被其他元素锁定后也关闭，例如 `dy-color-picker`
                  // `setTimeout` 防止 Firefox 选择文本
                  () => setTimeout(this.#close)
                }
              ></div>
              <dy-popover-ghost
                ${this.#popoverRef}
                role=${this.#role}
                data-position=${position}
                style=${styleMap({
                  ...style,
                  ...(this.constructor as unknown as DuoyunPopoverElement).ghostStyle,
                  ...this.ghostStyle,
                  pointerEvents: this.unreachable ? 'none' : undefined,
                })}
                @close=${this.#close}
                @mouseleave=${this.#isClickTrigger ? undefined : this.#close}
              >
                ${this.content}
              </dy-popover-ghost>
            </dy-reflect>
          `
      }
      <slot ${this.#slotRef} part=${DuoyunPopoverElement.slot}></slot>
    `;
  };

  ghostStyle?: GhostStyle;
}

export const Popover = DuoyunPopoverElement;

const ghostStyle = css`
  :host {
    position: fixed;
    z-index: ${theme.popupZIndex};
    background-color: var(--bg);
    color: var(--color);
    line-height: 1.5;
    padding: 0.6em 1em;
    border-radius: ${theme.normalRound};
    font-size: 0.875em;
    hyphens: auto;
    -moz-osx-font-smoothing: grayscale;
    -webkit-font-smoothing: antialiased;
    filter: drop-shadow(${theme.borderColor} 0px 0px 1px)
      drop-shadow(rgba(0, 0, 0, calc(${theme.maskAlpha})) 0px 7px 14px);
  }
  :host::after {
    content: '';
    position: absolute;
    background: transparent;
  }
  :host([data-position='top'])::after,
  :host([data-position='topRight'])::after,
  :host([data-position='topLeft'])::after,
  :host([data-position='bottom'])::after,
  :host([data-position='bottomRight'])::after,
  :host([data-position='bottomLeft'])::after {
    left: 0;
    height: ${offset}px;
    width: 100%;
  }
  :host([data-position='top'])::after,
  :host([data-position='topRight'])::after,
  :host([data-position='topLeft'])::after {
    top: 100%;
  }
  :host([data-position='bottom'])::after,
  :host([data-position='bottomRight'])::after,
  :host([data-position='bottomLeft'])::after {
    bottom: 100%;
  }
  :host([data-position='left'])::after,
  :host([data-position='right'])::after {
    top: 0;
    width: ${offset}px;
    height: 100%;
  }
  :host([data-position='left'])::after {
    left: 100%;
  }
  :host([data-position='right'])::after {
    right: 100%;
  }
  :host::before {
    content: '';
    position: absolute;
    border-style: solid;
  }
  :host([data-position='top'])::before,
  :host([data-position='topRight'])::before,
  :host([data-position='topLeft'])::before {
    top: 100%;
    border-color: var(--bg) transparent transparent transparent;
    border-width: 6px 6px 0 6px;
  }
  :host([data-position='top'])::before {
    left: 50%;
    transform: translateX(-50%);
  }
  :host([data-position='topRight'])::before {
    right: var(--arrow-offset);
    transform: translateX(50%);
  }
  :host([data-position='topLeft'])::before {
    left: var(--arrow-offset);
    transform: translateX(-50%);
  }
  :host([data-position='bottom'])::before,
  :host([data-position='bottomRight'])::before,
  :host([data-position='bottomLeft'])::before {
    bottom: 100%;
    border-color: transparent transparent var(--bg) transparent;
    border-width: 0 6px 6px 6px;
  }
  :host([data-position='bottom'])::before {
    left: 50%;
    transform: translateX(-50%);
  }
  :host([data-position='bottomRight'])::before {
    right: var(--arrow-offset);
    transform: translateX(50%);
  }
  :host([data-position='bottomLeft'])::before {
    left: var(--arrow-offset);
    transform: translateX(-50%);
  }
  :host([data-position='left'])::before {
    top: 50%;
    left: 100%;
    border-color: transparent transparent transparent var(--bg);
    border-width: 6px 0 6px 6px;
    transform: translateY(-50%);
  }
  :host([data-position='right'])::before {
    top: 50%;
    right: 100%;
    border-color: transparent var(--bg) transparent transparent;
    border-width: 6px 6px 6px 0;
    transform: translateY(-50%);
  }
`;

@customElement('dy-popover-ghost')
@adoptedStyle(ghostStyle)
@shadow()
export class DuoyunPopoverGhostElement extends GemElement {
  @emitter close: Emitter;

  #onKeyDown = hotkeys({ esc: () => this.close(null) });

  @mounted()
  #init = () => addListener(window, 'keydown', this.#onKeyDown);
}
