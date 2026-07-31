// TODO: 优化动画; 打开时卡片应该从原位置展开。反之收起到原位置

import {
  adoptedStyle,
  aria,
  customElement,
  effect,
  mounted,
  part,
  shadow,
  slot,
  state,
} from '@mantou/gem/lib/decorators';
import { createRef, createState, css, GemElement, html } from '@mantou/gem/lib/element';
import { createStore } from '@mantou/gem/lib/store';
import { addListener, styleMap } from '@mantou/gem/lib/utils';

import { easeOutCubic } from '../lib/easing';
import { icons } from '../lib/icons';
import { clamp } from '../lib/number';
import { theme } from '../lib/theme';

import './gesture';
import './pull-container';
import './scroll-box';
import './use';

const DURATION = 350;
const DURATION_MIN = 140;

export const expandableCardStore = createStore({ open: false });

const style = css`
  :host(:not([hidden])) {
    display: block;
    color: ${theme.textColor};
    border-radius: calc(${theme.normalRound} * 3);
    overflow: hidden;
    margin: 1em;
  }
  :host(:state(expand)) {
    .wrapper {
      view-transition-name: tap-card;
      position: fixed;
      z-index: ${theme.popupZIndex};
      top: env(titlebar-area-height, var(--titlebar-area-height, 0px));
      left: 0;
      width: 100%;
      height: calc(100% - env(titlebar-area-height, var(--titlebar-area-height, 0px)));
    }
    .mask {
      position: absolute;
      inset: 0;
      background-color: rgba(0, 0, 0, calc(${theme.maskAlpha} + 0.2));
    }
    .card {
      position: relative;
      height: 100%;
    }
  }
  :host(:not(:state(expand))) .card {
    overscroll-behavior: auto;
  }
  .card {
    background-color: ${theme.backgroundColor};
    will-change: transform;
  }
  .close {
    position: absolute;
    right: 1rem;
    top: 1rem;
    background: ${theme.backgroundColor};
    border-radius: 1e9px;
    padding: 0.4em;
    font-size: 0.5em;
  }
`;

@customElement('tap-card')
@adoptedStyle(style)
@aria({ role: 'article' })
@shadow()
export class TapCardElement extends GemElement {
  @slot static unnamed: string;
  @slot static expandable: string;
  @part static card: string;
  @part static close: string;

  @state expand: boolean;

  #cardRef = createRef<HTMLElement>();
  #state = createState({ offset: 0, width: 0, height: 0, top: 0, left: 0 });
  #closeSpeed = 0;

  get #height() {
    return this.#cardRef.value?.offsetHeight || 0;
  }

  #duration = (distance: number, height: number, speed = 0) => {
    if (speed > 0) {
      return clamp(DURATION_MIN, distance / speed, DURATION);
    }
    return clamp(DURATION_MIN, DURATION * (distance / (height || 1)), DURATION);
  };

  #animateOffset = (from: number, to: number, { duration = DURATION } = {}) => {
    this.#state({ offset: from });
    const start = performance.now();
    return new Promise<void>((resolve) => {
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        this.#state({ offset: from + (to - from) * easeOutCubic(t) });
        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
  };

  #finishClose = async () => {
    const height = this.#height;
    const from = this.#state.offset;
    const speed = this.#closeSpeed;
    this.#closeSpeed = 0;
    await this.#animateOffset(from, height, {
      duration: this.#duration(height - from, height, speed),
    });
  };

  #close = async () => {
    expandableCardStore({ open: false });
    await this.#finishClose();
    this.expand = false;
    this.#state({ offset: 0 });
  };

  #onBodyPull = (evt: CustomEvent<{ distance: number }>) => {
    if (!expandableCardStore.open) return;
    const offset = Math.max(0, evt.detail.distance);
    const height = this.#height;
    const speed = this.#closeSpeed;
    if (offset > height * 0.33 || speed) {
      this.#close();
      return;
    }
    this.#state({ offset });
  };

  #onBodyPullEnd = async () => {
    const offset = this.#state.offset;
    const height = this.#height;
    const speed = this.#closeSpeed;
    if (offset > height * 0.33 || speed) {
      this.#close();
      return;
    }
    this.#closeSpeed = 0;
    await this.#animateOffset(offset, 0, { duration: this.#duration(offset, height) });
  };

  @effect((i) => [i.expand])
  #closeWatcher = () => {
    if (!this.expand || typeof CloseWatcher === 'undefined') return;
    const watcher = new CloseWatcher();
    watcher.addEventListener('close', this.#close);
    return () => watcher.destroy();
  };

  @mounted()
  #init = () => {
    return addListener(this, 'click', () => {
      if (this.expand) return;
      const { width, height, top, left } = this.getBoundingClientRect();
      expandableCardStore({ open: (this.expand = true) });
      this.#state({ width, height, top, left });
      this.#animateOffset(this.#height, 0);
    });
  };

  render = () => {
    const { offset, width, height } = this.#state;

    return html`
      <div style=${this.expand ? styleMap({ width: `${width}px`, height: `${height}px` }) : ''}></div>
      <div class="wrapper">
        <div
          class="mask"
          style=${styleMap({ opacity: 1 - Math.min(1, offset / (this.#height || innerHeight)) })}
        ></div>
        <tap-pull-container
          ${this.#cardRef}
          part=${TapCardElement.card}
          class="card"
          disablescrollmask
          style=${styleMap({ transform: `translateY(${offset}px)` })}
          ?gesture=${this.expand}
          @pull=${this.#onBodyPull}
          @pullend=${this.#onBodyPullEnd}
        >
          <tap-use
            v-if=${this.expand}
            part=${TapCardElement.close}
            class="close"
            @click=${this.#close}
            .element=${icons.close}
          ></tap-use>
          <slot></slot>
          <slot v-if=${this.expand} name=${TapCardElement.expandable}></slot>
        </tap-pull-container>
      </div>
    `;
  };
}

export const Card = TapCardElement;
