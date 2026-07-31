import type { Emitter } from '@mantou/gem/lib/decorators';
import { adoptedStyle, boolattribute, customElement, emitter, mounted } from '@mantou/gem/lib/decorators';
import { css } from '@mantou/gem/lib/element';
import { addListener } from '@mantou/gem/lib/utils';

import { TapScrollBaseElement } from './base/scroll';

const PULL_ACTIVATE = 10;

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
  @boolattribute gesture = true;

  @emitter pull: Emitter<PullEventDetail>;
  @emitter pullend: Emitter<PullEventDetail>;

  #tracking = false;
  #pulling = false;
  #startY = 0;
  #startX = 0;
  #distance = 0;

  #reset = () => {
    this.#tracking = false;
    this.#pulling = false;
    this.#distance = 0;
  };

  #onPointerDown = (evt: PointerEvent) => {
    if (!this.gesture || evt.isPrimary === false || (evt.pointerType === 'mouse' && evt.button !== 0)) return;
    if (this.scrollTop > 0) return;
    this.#tracking = true;
    this.#pulling = false;
    this.#distance = 0;
    this.#startY = evt.clientY;
    this.#startX = evt.clientX;
  };

  #onPointerMove = (evt: PointerEvent) => {
    if (!this.#tracking) return;

    const dy = evt.clientY - this.#startY;
    const dx = evt.clientX - this.#startX;
    if (!this.#pulling) {
      if (this.scrollTop > 0) {
        this.#reset();
        return;
      }
      if (dy < PULL_ACTIVATE) return;
      if (Math.abs(dx) > dy) {
        this.#reset();
        return;
      }
      this.#pulling = true;
      this.setPointerCapture(evt.pointerId);
    }

    evt.preventDefault();
    this.#distance = Math.max(0, dy);
    this.pull({ distance: this.#distance });
  };

  #onTouchMove = (evt: TouchEvent) => {
    if (!this.#tracking || evt.touches.length !== 1 || this.scrollTop > 0) return;
    const touch = evt.touches[0];
    const dy = touch.clientY - this.#startY;
    const dx = touch.clientX - this.#startX;
    if (this.#pulling || (dy > 0 && Math.abs(dx) <= dy)) evt.preventDefault();
  };

  #onPointerUp = () => {
    if (!this.#tracking) return;
    const pulling = this.#pulling;
    const distance = this.#distance;
    this.#reset();
    if (pulling) this.pullend({ distance });
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
