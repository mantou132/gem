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

@customElement('tap-pull-container')
@adoptedStyle(style)
export class TapPullContainerElement extends TapScrollBaseElement {
  @boolattribute disableGesture: boolean;
  @numattribute pullActivate: number;

  @emitter pull: Emitter<PullEventDetail>;
  @emitter pullEnd: Emitter<PullEventDetail>;

  #tracking = false;
  #pulling = false;
  #startY = 0;
  #startX = 0;
  #distance = 0;
  #scrollContainers: HTMLElement[] = [];

  get #pullActivate() {
    return this.pullActivate || PULL_ACTIVATE;
  }

  #reset = () => {
    this.#tracking = false;
    this.#pulling = false;
    this.#distance = 0;
    this.#scrollContainers = [];
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
    if (this.scrollTop > SCROLL_DEVIATION) return true;
    return this.#scrollContainers.some((c) => c.scrollTop > SCROLL_DEVIATION);
  };

  #onPointerDown = (evt: PointerEvent) => {
    if (this.disableGesture || evt.isPrimary === false || (evt.pointerType === 'mouse' && evt.button !== 0)) return;
    this.#scrollContainers = this.#getScrollContainers(evt);
    this.#tracking = true;
    this.#pulling = false;
    this.#distance = 0;
    this.#startY = evt.clientY;
    this.#startX = evt.clientX;
  };

  #onPointerMove = (evt: PointerEvent) => {
    if (!this.#tracking) return;

    if (this.#hasScrolled()) {
      this.#startY = evt.clientY;
      this.#startX = evt.clientX;
      if (this.#pulling) {
        this.#pulling = false;
        this.#distance = 0;
        this.pull({ distance: 0 });
      }
      return;
    }

    const dy = evt.clientY - this.#startY;
    const dx = evt.clientX - this.#startX;
    if (!this.#pulling) {
      if (dy < this.#pullActivate) return;
      if (Math.abs(dx) > dy) {
        this.#reset();
        return;
      }
      this.#pulling = true;
      try {
        this.setPointerCapture(evt.pointerId);
      } catch {
        // ignore
      }
    }

    if (evt.cancelable) evt.preventDefault();
    this.#distance = Math.max(0, dy);
    this.pull({ distance: this.#distance });
  };

  #onTouchMove = (evt: TouchEvent) => {
    if (!this.#tracking || evt.touches.length !== 1 || this.#hasScrolled()) return;
    const touch = evt.touches[0];
    const dy = touch.clientY - this.#startY;
    const dx = touch.clientX - this.#startX;
    if (this.#pulling || (dy > 0 && Math.abs(dx) <= dy)) {
      if (evt.cancelable) evt.preventDefault();
    }
  };

  #onPointerUp = () => {
    if (!this.#tracking) return;
    const pulling = this.#pulling;
    const distance = this.#distance;
    this.#reset();
    if (pulling) this.pullEnd({ distance });
  };

  @mounted()
  #watchGesture = () => {
    const removes = [
      addListener(this, 'pointerdown', this.#onPointerDown, { capture: true }),
      addListener(this, 'pointermove', this.#onPointerMove, { passive: false, capture: true }),
      addListener(this, 'touchmove', this.#onTouchMove, { passive: false, capture: true }),
      addListener(this, 'pointerup', this.#onPointerUp, { capture: true }),
      addListener(this, 'pointercancel', this.#onPointerUp, { capture: true }),
    ];
    return () => removes.forEach((remove) => remove());
  };
}
