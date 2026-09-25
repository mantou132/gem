import { type GestureSample, getSwipe, type SwipeEventDetail } from '@mantou/gem/elements/base/gesture';
import type { Emitter } from '@mantou/gem/lib/decorators';
import { adoptedStyle, boolattribute, customElement, emitter, mounted, numattribute } from '@mantou/gem/lib/decorators';
import { css } from '@mantou/gem/lib/element';
import { addListener } from '@mantou/gem/lib/utils';

import { TapScrollBaseElement } from './base/scroll';

const PULL_ACTIVATE = 10;
const SCROLL_DEVIATION = 0.5;

const style = css`
  :host(:where(:not([hidden]))) {
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }
`;

export interface PullEventDetail {
  distance: number;
}

export interface PullEndEventDetail extends PullEventDetail {
  swipe?: SwipeEventDetail;
}

export type PushEventDetail = PullEventDetail;
export type PushEndEventDetail = PullEndEventDetail;

@customElement('tap-pull-container')
@adoptedStyle(style)
export class TapPullContainerElement extends TapScrollBaseElement {
  @boolattribute disableGesture: boolean;
  @boolattribute disableScroll: boolean;
  /** Include a swipe in `pull-end` / `push-end`; disabled by default. */
  @boolattribute detectSwipe: boolean;
  @numattribute pullActivate: number;

  @emitter pull: Emitter<PullEventDetail>;
  @emitter pullEnd: Emitter<PullEndEventDetail>;
  @emitter push: Emitter<PushEventDetail>;
  @emitter pushEnd: Emitter<PushEndEventDetail>;

  #pointerId?: number;
  #tracking = false;
  #pulling = false;
  #pushing = false;
  #startY = 0;
  #startX = 0;
  #distance = 0;
  #scrollContainers: HTMLElement[] = [];
  #swipeStart?: GestureSample;
  #swipeMoves: GestureSample[] = [];

  get #pullActivate() {
    return this.pullActivate || PULL_ACTIVATE;
  }

  #reset = () => {
    if (this.#pointerId !== undefined && this.hasPointerCapture(this.#pointerId)) {
      try {
        this.releasePointerCapture(this.#pointerId);
      } catch {
        // ignore
      }
    }
    this.#pointerId = undefined;
    this.#tracking = false;
    this.#pulling = false;
    this.#pushing = false;
    this.#distance = 0;
    this.#scrollContainers = [];
    this.#swipeStart = undefined;
    this.#swipeMoves = [];
  };

  #getScrollContainers = (evt: Event) => {
    const containers: HTMLElement[] = [];
    const path = evt.composedPath();
    for (const node of path) {
      if (node instanceof HTMLElement) {
        if (node.scrollHeight - node.clientHeight > 1) {
          const { overflowY } = getComputedStyle(node);
          if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
            containers.push(node);
          }
        }
      }
      if (node === this) break;
    }
    return containers;
  };

  #hasScrolled = () => {
    if (this.disableScroll) return;
    if (this.scrollTop > SCROLL_DEVIATION) return true;
    return this.#scrollContainers.some((c) => c.scrollTop > SCROLL_DEVIATION);
  };

  #canScrollDown = () => {
    if (this.disableScroll) return;
    if (this.scrollHeight - this.clientHeight - this.scrollTop > SCROLL_DEVIATION) return true;
    return this.#scrollContainers.some((c) => c.scrollHeight - c.clientHeight - c.scrollTop > SCROLL_DEVIATION);
  };

  #onPointerDown = (evt: PointerEvent) => {
    if (this.disableGesture || evt.isPrimary === false || (evt.pointerType === 'mouse' && evt.button !== 0)) return;
    this.#pointerId = evt.pointerId;
    this.#scrollContainers = this.#getScrollContainers(evt);
    this.#tracking = true;
    this.#pulling = false;
    this.#pushing = false;
    this.#distance = 0;
    this.#startY = evt.clientY;
    this.#startX = evt.clientX;
    this.#swipeStart = evt;
  };

  #onPointerMove = (evt: PointerEvent) => {
    if (this.#pointerId !== undefined && evt.pointerId !== this.#pointerId) return;
    // https://bugs.webkit.org/show_bug.cgi?id=210454
    const events = 'getCoalescedEvents' in evt ? evt.getCoalescedEvents() : [];
    if (events.length) {
      events.forEach((event) => this.#onMove(event));
    } else {
      this.#onMove(evt);
    }
  };

  #onMove = (evt: PointerEvent) => {
    if (!this.#tracking) return;

    if (this.#pulling || this.#pushing) {
      if (evt.cancelable) evt.preventDefault();
      this.#swipeMoves.push(evt);
      const dy = evt.clientY - this.#startY;
      const distance = Math.max(0, this.#pulling ? dy : -dy);
      this.#distance = distance;
      if (this.#pulling) {
        this.pull({ distance });
      } else {
        this.push({ distance });
      }
      return;
    }

    const dy = evt.clientY - this.#startY;
    const dx = evt.clientX - this.#startX;
    if (dy === 0) return;
    const pulling = dy > 0;
    const distance = Math.abs(dy);
    const canScroll = pulling ? this.#hasScrolled() : this.#canScrollDown();

    if (canScroll) {
      this.#startY = evt.clientY;
      this.#startX = evt.clientX;
      this.#swipeStart = evt;
      return;
    }

    if (distance < this.#pullActivate) return;

    if (Math.abs(dx) > distance) {
      this.#reset();
      return;
    }

    this.#pulling = pulling;
    this.#pushing = !pulling;
    this.#swipeMoves.length = 0;
    this.#swipeMoves.push(evt);
    try {
      this.setPointerCapture(evt.pointerId);
    } catch {
      // ignore
    }
    if (evt.cancelable) evt.preventDefault();
    this.#distance = distance;
    if (pulling) {
      this.pull({ distance });
    } else {
      this.push({ distance });
    }
  };

  #onTouchMove = (evt: TouchEvent) => {
    if (!this.#tracking || evt.touches.length !== 1 || this.disableScroll) return;
    const touch = evt.touches[0];
    const dy = touch.clientY - this.#startY;
    const dx = touch.clientX - this.#startX;
    if (this.#pulling || (!this.#hasScrolled() && dy > 0 && Math.abs(dx) <= dy)) {
      if (evt.cancelable) evt.preventDefault();
    }
    if (this.#pushing || (!this.#canScrollDown() && dy < 0 && Math.abs(dx) <= -dy)) {
      if (evt.cancelable) evt.preventDefault();
    }
  };

  #onTouch = (evt: TouchEvent) => {
    if (this.disableScroll) {
      evt.preventDefault();
    }
  };

  #onPointerUp = (evt: PointerEvent) => {
    if (!this.#tracking || (this.#pointerId !== undefined && evt.pointerId !== this.#pointerId)) return;
    const pulling = this.#pulling;
    const pushing = this.#pushing;
    const distance = this.#distance;
    const swipe =
      (pulling || pushing) && this.detectSwipe && this.#swipeStart && evt.type === 'pointerup'
        ? getSwipe(this.#swipeStart, this.#swipeMoves || [], evt)
        : undefined;
    this.#reset();
    if (pulling) this.pullEnd({ distance, swipe });
    if (pushing) this.pushEnd({ distance, swipe });
  };

  @mounted()
  #watchGesture = () => {
    const removes = [
      addListener(this, 'pointerdown', this.#onPointerDown, { capture: true }),
      addListener(this, 'pointermove', this.#onPointerMove, { passive: false, capture: true }),
      addListener(this, 'touchmove', this.#onTouchMove, { passive: false, capture: true }),
      addListener(this, 'touchmove', this.#onTouch, { capture: true }),
      addListener(this, 'pointerup', this.#onPointerUp, { capture: true }),
      addListener(this, 'pointercancel', this.#onPointerUp, { capture: true }),
    ];
    return () => removes.forEach((remove) => remove());
  };
}
