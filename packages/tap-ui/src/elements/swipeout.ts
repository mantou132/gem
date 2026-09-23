import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  aria,
  boolattribute,
  customElement,
  emitter,
  numattribute,
  part,
  shadow,
  slot,
  state,
  unmounted,
} from '@mantou/gem/lib/decorators';
import { createRef, createState, css, GemElement, html } from '@mantou/gem/lib/element';

import { easeOutCubic } from '../lib/easing';
import { theme, themeStore } from '../lib/theme';
import type { PanEventDetail, SwipeEventDetail } from './gesture';

import './gesture';

export type SwipeoutSide = 'start' | 'end';

interface SideInfo {
  elements: HTMLElement[];
  widths: number[];
  totalWidth: number;
  collapsedOffsets: number[];
  danger?: HTMLElement;
}

type SwipeoutLongAction = HTMLElement & { dataset: DOMStringMap & { tapSwipeoutLong?: string } };

interface LongDragState {
  side: SwipeoutSide;
  action: SwipeoutLongAction;
  danger: boolean;
  padding: number;
}

const EMPTY_SIDE: SideInfo = { elements: [], widths: [], totalWidth: 0, collapsedOffsets: [] };
const DURATION = 260;
const LONG_DRAG_FRICTION = 0.08;
const VAR_SWIPER_LONG_PADDING = '--swipeout-long-padding';

const style = css`
  :host(:where(:not([hidden]))) {
    view-transition-name: match-element;
    display: block;
    position: relative;
    overflow: hidden;
  }
  .actions {
    position: absolute;
    inset-block: 0;
    z-index: 0;
    display: flex;
    flex-wrap: nowrap;
    align-items: stretch;
    overflow: hidden;
  }
  /* Webkit need */
  .actions[inert] {
    visibility: hidden;
  }
  .actions.start {
    inset-inline-start: 0;
  }
  .actions.end {
    inset-inline-end: 0;
  }
  ::slotted(*) {
    box-sizing: border-box;
    flex-shrink: 0;
    height: 100%;
    will-change: transform, width;
  }
  .content[data-tap-swipeout-long] {
    transition: transform 180ms ${themeStore.timingEasingFunction};
  }
  ::slotted([data-tap-swipeout-long]) {
    transition:
      width 180ms ${themeStore.timingEasingFunction},
      padding-inline 120ms ease-out;
  }
  ::slotted([data-tap-swipeout-long='start']) {
    padding-inline-start: var(${VAR_SWIPER_LONG_PADDING}) !important;
  }
  ::slotted([data-tap-swipeout-long='end']) {
    padding-inline-end: var(${VAR_SWIPER_LONG_PADDING}) !important;
  }
  .content {
    position: relative;
    z-index: 1;
    min-width: 100%;
    background: ${theme.backgroundColor};
    will-change: transform;
  }
`;

@customElement('tap-swipeout')
@adoptedStyle(style)
@aria({ role: 'group' })
@shadow()
export class TapSwipeoutElement extends GemElement {
  @slot @part static start: string;
  @slot @part static end: string;
  @slot @part static content: string;
  @slot static danger: string;

  @boolattribute disabled: boolean;
  @boolattribute enableLongDrag: boolean;
  @numattribute threshold: number;
  @state opened: boolean;

  @emitter change: Emitter<SwipeoutSide | null>;
  @emitter longDrag: Emitter<SwipeoutSide>;

  #startSlotRef = createRef<HTMLSlotElement>();
  #endSlotRef = createRef<HTMLSlotElement>();
  #dangerSlotRef = createRef<HTMLSlotElement>();
  #contentRef = createRef<SwipeoutLongAction>();

  #state = createState({ visibleSide: null as SwipeoutSide | null });
  #offset = 0;
  #sideCache: { start?: SideInfo; end?: SideInfo } = {};
  #cancelAnimation?: () => void;
  #dragOffset?: number;
  #longDrag?: LongDragState;

  static activeSwipeout?: TapSwipeoutElement;

  get #threshold() {
    return this.threshold || 0.35;
  }

  #measureSide = (side: SwipeoutSide): SideInfo => {
    const slots = side === 'start' ? [this.#startSlotRef.value] : [this.#endSlotRef.value, this.#dangerSlotRef.value];
    const elements = slots
      .flatMap((e) => e?.assignedElements({ flatten: true }))
      .filter((el): el is HTMLElement => el instanceof HTMLElement);
    if (!elements.length) {
      this.#sideCache[side] = EMPTY_SIDE;
      return EMPTY_SIDE;
    }
    elements.forEach((el, i) => {
      el.style.width = '';
      el.style.transform = '';
      el.style.zIndex = String(side === 'start' ? i + 1 : elements.length - i);
    });
    const widths = elements.map((el) => el.getBoundingClientRect().width);
    const collapsedOffsets = new Array<number>(widths.length);
    let totalWidth = 0;
    if (side === 'start') {
      for (let i = 0; i < widths.length; i++) {
        collapsedOffsets[i] = -totalWidth;
        totalWidth += widths[i];
      }
    } else {
      for (let i = widths.length - 1; i >= 0; i--) {
        collapsedOffsets[i] = totalWidth;
        totalWidth += widths[i];
      }
    }
    const last = elements.at(-1);
    const danger = side === 'end' && last?.slot === TapSwipeoutElement.danger ? last : undefined;
    const info: SideInfo = { elements, widths, totalWidth, collapsedOffsets, danger };
    this.#sideCache[side] = info;
    return info;
  };

  #ensureSideInfo = (side: SwipeoutSide): SideInfo => {
    return this.#sideCache[side] ?? this.#measureSide(side);
  };

  #getCachedSideInfo = (side: SwipeoutSide): SideInfo => this.#sideCache[side] ?? EMPTY_SIDE;

  #updateSideLayout = (side: SwipeoutSide, info: SideInfo, distance: number) => {
    const { elements, widths, totalWidth, collapsedOffsets } = info;
    const count = elements.length;
    if (!count || !totalWidth) return;
    if (distance > totalWidth) {
      const extra = (distance - totalWidth) / count;
      for (let i = 0; i < count; i++) {
        const el = elements[i];
        if (el.style.transform) el.style.transform = '';
        const width = `${widths[i] + extra}px`;
        if (el.style.width !== width) el.style.width = width;
      }
    } else {
      const progress = 1 - distance / totalWidth;
      for (let i = 0; i < count; i++) {
        const el = elements[i];
        if (el.style.width) el.style.width = '';
        const tx = progress * collapsedOffsets[i];
        const transform = tx ? `translateX(${tx}px)` : '';
        if (el.style.transform !== transform) el.style.transform = transform;
      }
    }

    const long = this.#longDrag?.side === side ? this.#longDrag : undefined;
    if (!long) return;
    if (long.danger) {
      long.action.style.width = `${this.clientWidth}px`;
    } else {
      const extra = Math.max(0, distance - totalWidth) / count;
      long.action.style.setProperty(VAR_SWIPER_LONG_PADDING, `${long.padding + extra}px`);
    }
  };

  #updateLayout = (offset: number) => {
    const content = this.#contentRef.value;
    if (content) {
      content.style.transform = offset ? `translateX(${offset}px)` : '';
    }
    this.#updateSideLayout('start', this.#getCachedSideInfo('start'), Math.max(0, offset));
    this.#updateSideLayout('end', this.#getCachedSideInfo('end'), Math.max(0, -offset));
  };

  #updateOffset = (offset: number) => {
    this.#offset = offset;
    this.#updateLayout(offset);
  };

  #animateOffset = (from: number, to: number, duration = DURATION) => {
    this.#cancelAnimation?.();
    this.#updateOffset(from);
    if (from === to) return Promise.resolve(true);
    const start = performance.now();
    return new Promise<boolean>((resolve) => {
      let rafId = 0;
      const finish = (completed: boolean) => {
        this.#cancelAnimation = undefined;
        resolve(completed);
      };
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        this.#updateOffset(from + (to - from) * easeOutCubic(t));
        if (t < 1) {
          rafId = requestAnimationFrame(tick);
        } else {
          finish(true);
        }
      };
      rafId = requestAnimationFrame(tick);
      this.#cancelAnimation = () => {
        cancelAnimationFrame(rafId);
        finish(false);
      };
    });
  };

  #rubberBand = (rawOffset: number, startWidth: number, endWidth: number) => {
    if (!rawOffset) return 0;
    const sign = Math.sign(rawOffset);
    const boundary = sign > 0 ? startWidth : endWidth;
    if (!boundary) return 0;
    const distance = Math.abs(rawOffset);
    if (distance <= boundary) return rawOffset;
    const dimension = this.clientWidth || 375;
    const extra = distance - boundary;
    return sign * (boundary + (extra * 0.9 * dimension) / (dimension + extra * 0.9));
  };

  #longDragThreshold = (info: SideInfo) => {
    const width = this.clientWidth || 375;
    const safeDistance = Math.min(Math.max(44, width * 0.3), Math.max(0, width - info.totalWidth));
    return info.totalWidth + safeDistance;
  };

  #clearLongDrag = (immediate = false) => {
    const long = this.#longDrag;
    if (!long) return;
    long.action.style.setProperty(VAR_SWIPER_LONG_PADDING, `${long.padding}px`);
    const clear = () => {
      long.action.style.removeProperty(VAR_SWIPER_LONG_PADDING);
      delete long.action.dataset.tapSwipeoutLong;
      delete this.#contentRef.value!.dataset.tapSwipeoutLong;
    };
    if (immediate) {
      clear();
    } else {
      setTimeout(clear, 180);
    }
    this.#longDrag = undefined;
  };

  #syncLongDrag = (rawOffset: number, startWidth: number, endWidth: number) => {
    const side: SwipeoutSide | null = rawOffset > 0 ? 'start' : rawOffset < 0 ? 'end' : null;
    if (!side || !this.enableLongDrag) {
      this.#clearLongDrag();
      return this.#rubberBand(rawOffset, startWidth, endWidth);
    }
    const info = this.#getCachedSideInfo(side);
    const threshold = this.#longDragThreshold(info);
    const distance = Math.abs(rawOffset);
    if (distance < threshold) {
      this.#clearLongDrag();
      return this.#rubberBand(rawOffset, startWidth, endWidth);
    }

    if (this.#longDrag?.side !== side) {
      this.#clearLongDrag();
      const action = info.danger || info.elements.at(-1);
      if (!action) return this.#rubberBand(rawOffset, startWidth, endWidth);
      const danger = action === info.danger;
      const property = side === 'start' ? 'paddingInlineStart' : 'paddingInlineEnd';
      const padding = danger ? 0 : Number.parseFloat(getComputedStyle(action)[property]) || 0;
      const long = { side, action, danger, padding } as LongDragState;
      long.action.dataset.tapSwipeoutLong = danger ? 'danger' : side;
      this.#contentRef.value!.dataset.tapSwipeoutLong = 'content';
      this.#longDrag = long;
      this.longDrag(side);
    }

    if (this.#longDrag?.danger) {
      const sign = side === 'start' ? 1 : -1;
      return sign * (this.clientWidth || 375);
    }
    const sign = side === 'start' ? 1 : -1;
    const thresholdOffset = Math.abs(this.#rubberBand(sign * threshold, startWidth, endWidth));
    return sign * (thresholdOffset + (distance - threshold) * LONG_DRAG_FRICTION);
  };

  #setOpened = (opened: boolean) => {
    if (opened && TapSwipeoutElement.activeSwipeout !== this) {
      TapSwipeoutElement.activeSwipeout?.close();
      TapSwipeoutElement.activeSwipeout = this;
    } else if (!opened && TapSwipeoutElement.activeSwipeout === this) {
      TapSwipeoutElement.activeSwipeout = undefined;
    }
    this.opened = opened;
  };

  #settle = async (side: SwipeoutSide | null) => {
    this.#dragOffset = undefined;
    this.#clearLongDrag(true);
    const targetOffset = side ? (side === 'start' ? 1 : -1) * this.#ensureSideInfo(side).totalWidth : 0;
    this.#setOpened(side !== null);
    // Keep the current side visible during closing animation
    const currentSide: SwipeoutSide | null = this.#offset > 0 ? 'start' : this.#offset < 0 ? 'end' : null;
    const visibleSide = side || currentSide;
    this.#state({ visibleSide });
    const completed = await this.#animateOffset(this.#offset, targetOffset);
    if (!completed) return;
    if (side !== visibleSide) {
      this.#state({ visibleSide: side });
    }
    this.change(side);
  };

  open = (side: SwipeoutSide = 'end') => {
    if (this.disabled) return;
    const info = this.#ensureSideInfo(side);
    if (!info.totalWidth) return;
    return this.#settle(side);
  };

  close = () => this.#settle(null);

  toggle = (side: SwipeoutSide = 'end') => {
    return this.#state.visibleSide === side ? this.close() : this.open(side);
  };

  dismiss = async () => {
    this.#dragOffset = undefined;
    this.#clearLongDrag();
    this.#cancelAnimation?.();
    this.#setOpened(false);
    const { height } = this.getBoundingClientRect();
    await this.animate(
      [
        { height: `${height}px`, minHeight: '0px' },
        { height: '0px', minHeight: '0px', paddingBlock: '0px', marginBlock: '0px', borderBlockWidth: '0px' },
      ],
      {
        duration: DURATION,
        easing: themeStore.timingEasingFunction,
      },
    ).finished;
    this.remove();
  };

  #onPan = (evt: CustomEvent<PanEventDetail>) => {
    if (this.disabled || !evt.detail.x) return;
    const startWidth = this.#ensureSideInfo('start').totalWidth;
    const endWidth = this.#ensureSideInfo('end').totalWidth;
    if (!startWidth && !endWidth) return;
    this.#cancelAnimation?.();
    this.#dragOffset = (this.#dragOffset ?? this.#offset) + evt.detail.x;
    if (!startWidth && this.#dragOffset > 0) this.#dragOffset = 0;
    if (!endWidth && this.#dragOffset < 0) this.#dragOffset = 0;
    const offset = this.#syncLongDrag(this.#dragOffset, startWidth, endWidth);
    if (offset === this.#offset) return;
    const visibleSide: SwipeoutSide | null = offset > 0 ? 'start' : offset < 0 ? 'end' : null;
    if (visibleSide !== this.#state.visibleSide) this.#state({ visibleSide });
    this.#updateOffset(offset);
  };

  #onSwipe = (evt: CustomEvent<SwipeEventDetail>) => {
    if (this.#longDrag) return;
    const { direction } = evt.detail;
    const { visibleSide } = this.#state;
    if (visibleSide === 'end' && direction === 'right') {
      this.close();
    } else if (visibleSide === 'start' && direction === 'left') {
      this.close();
    } else if (direction === 'left' && this.#ensureSideInfo('end').totalWidth > 0) {
      this.open('end');
    } else if (direction === 'right' && this.#ensureSideInfo('start').totalWidth > 0) {
      this.open('start');
    }
  };

  #onPanEnd = () => {
    this.#dragOffset = undefined;
    const long = this.#longDrag;
    if (long) {
      if (long.danger) this.#setOpened(true);
      long.action.click();
      return;
    }

    const offset = this.#offset;
    const startWidth = this.#getCachedSideInfo('start').totalWidth;
    const endWidth = this.#getCachedSideInfo('end').totalWidth;
    if (startWidth && offset > startWidth * this.#threshold) {
      this.#settle('start');
    } else if (endWidth && offset < -endWidth * this.#threshold) {
      this.#settle('end');
    } else {
      this.#settle(null);
    }
  };

  #onContentClick = (evt: Event) => {
    if (!this.#state.visibleSide) return;
    evt.preventDefault();
    evt.stopPropagation();
    this.close();
  };

  #onActionClick = () => queueMicrotask(this.close);

  #onSlotChange = (evt: Event) => {
    const slot = evt.target as HTMLSlotElement;
    const side: SwipeoutSide = slot.name === TapSwipeoutElement.start ? 'start' : 'end';
    if (this.#longDrag?.side === side) this.#clearLongDrag();
    delete this.#sideCache[side];

    if (this.#state.visibleSide !== side) return;

    const info = this.#ensureSideInfo(side);
    if (this.opened) {
      this.#updateOffset(side === 'start' ? info.totalWidth : -info.totalWidth);
    } else {
      this.#updateLayout(this.#offset);
    }
  };

  @unmounted()
  #clean = () => {
    this.#clearLongDrag();
    this.#cancelAnimation?.();
    this.#setOpened(false);
  };

  render = () => {
    const { visibleSide } = this.#state;
    return html`
      <div
        class="actions start"
        part=${TapSwipeoutElement.start}
        ?inert=${visibleSide !== 'start'}
      >
        <slot ${this.#startSlotRef} name=${TapSwipeoutElement.start} @click=${this.#onActionClick} @slotchange=${this.#onSlotChange}></slot>
      </div>
      <div
        class="actions end"
        part=${TapSwipeoutElement.end}
        ?inert=${visibleSide !== 'end'}
      >
        <slot ${this.#endSlotRef} name=${TapSwipeoutElement.end} @click=${this.#onActionClick} @slotchange=${this.#onSlotChange}></slot>
        <slot ${this.#dangerSlotRef} name=${TapSwipeoutElement.danger} @slotchange=${this.#onSlotChange}></slot>
      </div>
      <tap-gesture
        ${this.#contentRef}
        class="content"
        part=${TapSwipeoutElement.content}
        touch-action="pan-y"
        @pan=${this.#onPan}
        @swipe=${this.#onSwipe}
        @end=${this.#onPanEnd}
        @click=${this.#onContentClick}
      >
        <slot></slot>
      </tap-gesture>
    `;
  };
}
