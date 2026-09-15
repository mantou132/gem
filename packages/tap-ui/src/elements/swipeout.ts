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
}

const EMPTY_SIDE: SideInfo = { elements: [], widths: [], totalWidth: 0, collapsedOffsets: [] };
const DURATION = 260;

const style = css`
  :host(:where(:not([hidden]))) {
    view-transition-name: match-element;
    display: block;
    position: relative;
    overflow: hidden;
    -webkit-tap-highlight-color: transparent;
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
  .actions::slotted(*),
  ::slotted([slot='start']),
  ::slotted([slot='end']) {
    box-sizing: border-box;
    flex-shrink: 0;
    height: 100%;
    will-change: transform, width;
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
  @slot static del: string;

  @boolattribute disabled: boolean;
  @numattribute threshold: number;
  @state opened: boolean;

  @emitter change: Emitter<SwipeoutSide | null>;

  #startSlotRef = createRef<HTMLSlotElement>();
  #endSlotRef = createRef<HTMLSlotElement>();
  #delSlotRef = createRef<HTMLSlotElement>();
  #contentRef = createRef<HTMLElement>();

  #state = createState({ visibleSide: null as SwipeoutSide | null });
  #offset = 0;
  #sideCache: { start?: SideInfo; end?: SideInfo } = {};
  #cancelAnimation?: () => void;

  static activeSwipeout?: TapSwipeoutElement;

  get #threshold() {
    return this.threshold || 0.35;
  }

  #measureSide = (side: SwipeoutSide): SideInfo => {
    const slot = side === 'start' ? [this.#startSlotRef.value] : [this.#endSlotRef.value, this.#delSlotRef.value];
    const elements = slot
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
    const info: SideInfo = { elements, widths, totalWidth, collapsedOffsets };
    this.#sideCache[side] = info;
    return info;
  };

  #ensureSideInfo = (side: SwipeoutSide): SideInfo => {
    return this.#sideCache[side] ?? this.#measureSide(side);
  };

  #getCachedSideInfo = (side: SwipeoutSide): SideInfo => this.#sideCache[side] ?? EMPTY_SIDE;

  #updateSideLayout = (info: SideInfo, distance: number) => {
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
      return;
    }
    const progress = 1 - distance / totalWidth;
    for (let i = 0; i < count; i++) {
      const el = elements[i];
      if (el.style.width) el.style.width = '';
      const tx = progress * collapsedOffsets[i];
      const transform = tx ? `translateX(${tx}px)` : '';
      if (el.style.transform !== transform) el.style.transform = transform;
    }
  };

  #updateLayout = (offset: number) => {
    const content = this.#contentRef.value;
    if (content) {
      content.style.transform = offset ? `translateX(${offset}px)` : '';
    }
    this.#updateSideLayout(this.#getCachedSideInfo('start'), Math.max(0, offset));
    this.#updateSideLayout(this.#getCachedSideInfo('end'), Math.max(0, -offset));
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

  #applyRubberBand = (currentOffset: number, dx: number, minOffset: number, maxOffset: number) => {
    if (!dx) return currentOffset;
    const direction = Math.sign(dx);
    const boundary = direction > 0 ? maxOffset : minOffset;
    const nextRaw = currentOffset + dx;
    if (direction * (nextRaw - boundary) <= 0) {
      return nextRaw;
    }
    const dimension = this.clientWidth || 375;
    const overflow = Math.max(0, direction * (currentOffset - boundary));
    const friction = Math.max(0.08, 0.4 * (1 - Math.min(1, overflow / (dimension * 0.5))));
    const distanceToBoundary = Math.max(0, direction * (boundary - currentOffset));
    const outsideDelta = Math.abs(dx) - distanceToBoundary;
    return currentOffset + direction * (distanceToBoundary + outsideDelta * friction);
  };

  #settle = async (side: SwipeoutSide | null) => {
    const targetOffset = side ? (side === 'start' ? 1 : -1) * this.#ensureSideInfo(side).totalWidth : 0;
    if (side) {
      if (TapSwipeoutElement.activeSwipeout !== this) {
        TapSwipeoutElement.activeSwipeout?.close();
      }
      TapSwipeoutElement.activeSwipeout = this;
    } else if (TapSwipeoutElement.activeSwipeout === this) {
      TapSwipeoutElement.activeSwipeout = undefined;
    }
    this.opened = side !== null;
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
    this.#cancelAnimation?.();
    if (TapSwipeoutElement.activeSwipeout === this) {
      TapSwipeoutElement.activeSwipeout = undefined;
    }
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
    const currentOffset = this.#offset;
    const dx = evt.detail.x;
    if (!startWidth && (currentOffset > 0 || (currentOffset === 0 && dx > 0))) return;
    if (!endWidth && (currentOffset < 0 || (currentOffset === 0 && dx < 0))) return;
    this.#cancelAnimation?.();
    let offset = this.#applyRubberBand(currentOffset, dx, -endWidth, startWidth);
    if (!startWidth && offset > 0) offset = 0;
    if (!endWidth && offset < 0) offset = 0;
    if (offset === currentOffset) return;
    const visibleSide: SwipeoutSide | null = offset > 0 ? 'start' : offset < 0 ? 'end' : null;
    if (visibleSide !== this.#state.visibleSide) this.#state({ visibleSide });
    this.#updateOffset(offset);
  };

  #onSwipe = (evt: CustomEvent<SwipeEventDetail>) => {
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
    this.#cancelAnimation?.();
    if (TapSwipeoutElement.activeSwipeout === this) {
      TapSwipeoutElement.activeSwipeout = undefined;
    }
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
        <slot ${this.#delSlotRef} name=${TapSwipeoutElement.del} @slotchange=${this.#onSlotChange}></slot>
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
