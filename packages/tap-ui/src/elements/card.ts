import { createDecoratorTheme } from '@mantou/gem/helper/theme';
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
import { addListener } from '@mantou/gem/lib/utils';

import { easeOutCubic } from '../lib/easing';
import { icons } from '../lib/icons';
import { clamp } from '../lib/number';
import { theme } from '../lib/theme';
import { pageStore } from './page';

import './gesture';
import './pull-container';
import './scroll-box';
import './use';

const DURATION = 350;
const DURATION_MIN = 140;
const SAFE_AREA_INSET = {
  top: 'var(--safe-area-inset-top, env(safe-area-inset-top, 0px))',
  bottom: 'var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))',
};
const SCREEN_CORNER_RADIUS = 'var(--screen-corner-radius, 0px)';
const elementTheme = createDecoratorTheme({
  progress: 0,
  scale: 1,
  width: '0px',
  height: '0px',
  top: '0px',
  left: '0px',
  targetW: '1px',
  targetH: '1px',
  tlRadius: `calc(${theme.normalRound} * 3)`,
  trRadius: `calc(${theme.normalRound} * 3)`,
  brRadius: `calc(${theme.normalRound} * 3)`,
  blRadius: `calc(${theme.normalRound} * 3)`,
  firstPadding: '0px',
  firstHeight: '0px',
  firstMinHeight: '0px',
});

const style = css`
  :host(:not([hidden])) {
    display: block;
    color: ${theme.textColor};
    border-radius: calc(${theme.normalRound} * 3);
    overflow: hidden;
  }
  :host(:state(expand)) {
    .wrapper {
      view-transition-name: tap-card;
      position: fixed;
      z-index: ${theme.popupZIndex};
      top: var(--titlebar-area-height, env(titlebar-area-height, 0px));
      left: 0;
      width: 100%;
      height: calc(100% - var(--titlebar-area-height, env(titlebar-area-height, 0px)));
    }
    .mask {
      position: absolute;
      inset: 0;
      background-color: rgba(0, 0, 0, calc(${theme.maskAlpha} + 0.2));
    }
    .placeholder {
      width: ${elementTheme.width};
      height: ${elementTheme.height};
    }
    .clip {
      position: absolute;
      overflow: hidden;
      will-change: top, left, width, height;
      top: calc(${elementTheme.top} * (1 - ${elementTheme.progress}));
      left: calc(${elementTheme.left} * (1 - ${elementTheme.progress}));
      width: calc(${elementTheme.width} + (${elementTheme.targetW} - ${elementTheme.width}) * ${elementTheme.progress});
      height: calc(
        ${elementTheme.height} + (${elementTheme.targetH} - ${elementTheme.height}) * ${elementTheme.progress}
      );
    }
    .card {
      width: 100%;
      height: 100%;
      transform: scale(${elementTheme.scale});
    }
    :is(.clip, .card) {
      border-top-left-radius: calc(
        ${elementTheme.tlRadius} * (1 - ${elementTheme.progress}) + ${SCREEN_CORNER_RADIUS} * ${elementTheme.progress}
      );
      border-top-right-radius: calc(
        ${elementTheme.trRadius} * (1 - ${elementTheme.progress}) + ${SCREEN_CORNER_RADIUS} * ${elementTheme.progress}
      );
      border-bottom-right-radius: calc(
        ${elementTheme.brRadius} * (1 - ${elementTheme.progress}) + ${SCREEN_CORNER_RADIUS} * ${elementTheme.progress}
      );
      border-bottom-left-radius: calc(
        ${elementTheme.blRadius} * (1 - ${elementTheme.progress}) + ${SCREEN_CORNER_RADIUS} * ${elementTheme.progress}
      );
    }
  }
  :host(:not(:state(expand))) .card {
    overscroll-behavior: auto;
    transition: transform ${DURATION_MIN}ms ${theme.timingFunction};
  }
  :host(:not(:state(expand)):state(press)) .card {
    transform: scale(0.98);
  }
  .card {
    background-color: ${theme.backgroundColor};
    will-change: transform;
    transform-origin: center;
    border-top-left-radius: ${elementTheme.tlRadius};
    border-top-right-radius: ${elementTheme.trRadius};
    border-bottom-right-radius: ${elementTheme.brRadius};
    border-bottom-left-radius: ${elementTheme.blRadius};
  }
  .mask,
  .close {
    opacity: ${elementTheme.progress};
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
  :host(:state(expand)) slot:not([name])::slotted(:first-child) {
    padding-top: calc(${elementTheme.firstPadding} + ${SAFE_AREA_INSET.top} * ${elementTheme.progress}) !important;
    height: calc(${elementTheme.firstHeight} + ${SAFE_AREA_INSET.top} * ${elementTheme.progress}) !important;
    min-height: calc(${elementTheme.firstMinHeight} + ${SAFE_AREA_INSET.top} * ${elementTheme.progress}) !important;
  }
`;

/**
 * The first element in the default slot is treated as the card header during expansion.
 * Its top padding, height, and min-height are animated to include the top safe area in fullscreen mode.
 */
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
  @state press: boolean;

  #cardRef = createRef<HTMLElement>();
  #wrapperRef = createRef<HTMLElement>();
  #state = createState({
    progress: 0,
    pullScale: 1,
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    targetWidth: 1,
    targetHeight: 1,
    topLeftRadius: `0px`,
    topRightRadius: `0px`,
    bottomRightRadius: `0px`,
    bottomLeftRadius: `0px`,
    firstElementChildPaddingTop: 0,
    firstElementChildHeight: 0,
    firstElementChildMinHeight: 0,
  });
  #animationId = 0;
  #closing = false;

  get #height() {
    return this.#cardRef.value?.offsetHeight || 0;
  }

  #duration = (distance: number, height: number) => {
    return clamp(DURATION_MIN, DURATION * (distance / (height || 1)), DURATION);
  };

  #getBorderRadius = (style: CSSStyleDeclaration) => ({
    topLeftRadius: style.borderTopLeftRadius,
    topRightRadius: style.borderTopRightRadius,
    bottomRightRadius: style.borderBottomRightRadius,
    bottomLeftRadius: style.borderBottomLeftRadius,
  });

  #animate = (from: number, to: number, update: (value: number) => void, { duration = DURATION } = {}) => {
    const animationId = ++this.#animationId;
    update(from);
    const start = performance.now();
    return new Promise<void>((resolve) => {
      const tick = (now: number) => {
        if (animationId !== this.#animationId) return resolve();
        const t = Math.min(1, (now - start) / duration);
        update(from + (to - from) * easeOutCubic(t));
        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
  };

  #animateProgress = (from: number, to: number, options = {}) =>
    this.#animate(from, to, (progress) => this.#state({ progress }), options);

  #animatePullScale = (from: number, to: number, options = {}) =>
    this.#animate(from, to, (pullScale) => this.#state({ pullScale }), options);

  #animateClose = () => {
    const { progress, pullScale } = this.#state;
    const card = this.#cardRef.value;
    const scrollTop = card?.scrollTop || 0;
    return this.#animate(
      0,
      1,
      (value) => {
        card?.scrollTo({ top: scrollTop * (1 - value) });
        this.#state({ progress: progress * (1 - value), pullScale: pullScale + (1 - pullScale) * value });
      },
      { duration: this.#duration(progress, 1) },
    );
  };

  #close = async () => {
    if (!this.expand || this.#closing) return;
    this.#closing = true;
    pageStore({ shouldDim: false });
    await this.#animateClose();
    this.expand = false;
    this.#state({ progress: 0, pullScale: 1 });
    this.#closing = false;
  };

  #onBodyPull = (evt: CustomEvent<{ distance: number }>) => {
    if (!pageStore.shouldDim || this.#state.progress !== 1 || this.#closing) return;
    const height = this.#height;
    const distance = Math.max(0, evt.detail.distance);
    const threshold = height * 0.1;
    const pullScale = Math.max(0, 1 - distance / height);
    this.#state({ pullScale });
    if (distance >= threshold) {
      this.#close();
    }
  };

  #onBodyPullEnd = () => {
    if (!pageStore.shouldDim || this.#closing) return;
    this.#animatePullScale(this.#state.pullScale, 1, { duration: DURATION_MIN });
  };

  @effect((i) => [i.expand])
  #closeWatcher = () => {
    if (!this.expand || typeof CloseWatcher === 'undefined') return;
    const watcher = new CloseWatcher();
    watcher.addEventListener('close', this.#close);
    return () => watcher.destroy();
  };

  #open = async () => {
    if (this.expand || this.#closing) return;
    this.press = false;
    const { width, height, top, left } = this.getBoundingClientRect();
    const computedStyle = getComputedStyle(this);
    const firstElementChildStyle = getComputedStyle(this.firstElementChild || this);
    this.#state({
      progress: 0,
      pullScale: 1,
      width,
      height,
      firstElementChildPaddingTop: Number.parseFloat(firstElementChildStyle.paddingTop) || 0,
      firstElementChildHeight: Number.parseFloat(firstElementChildStyle.height) || 0,
      firstElementChildMinHeight: Number.parseFloat(firstElementChildStyle.minHeight) || 0,
      ...this.#getBorderRadius(computedStyle),
    });
    pageStore({ shouldDim: (this.expand = true) });
    const wrapper = this.#wrapperRef.value!.getBoundingClientRect();
    this.#state({
      top: top - wrapper.top,
      left: left - wrapper.left,
      targetWidth: wrapper.width || 1,
      targetHeight: wrapper.height || 1,
    });
    await this.#animateProgress(0, 1);
  };

  @mounted()
  #init = () => {
    const onPressStart = (evt: PointerEvent) => {
      if (this.expand || evt.isPrimary === false || (evt.pointerType === 'mouse' && evt.button !== 0)) return;
      this.#state(this.#getBorderRadius(getComputedStyle(this)));
      this.press = true;
    };
    const onPressEnd = () => (this.press = false);
    const removes = [
      addListener(this, 'click', this.#open),
      addListener(this, 'pointerdown', onPressStart, { capture: true }),
      addListener(window, 'pointerup', onPressEnd, { capture: true }),
      addListener(window, 'pointercancel', onPressEnd, { capture: true }),
    ];
    return () => removes.forEach((remove) => remove());
  };

  @elementTheme()
  #theme = () => {
    const {
      progress,
      pullScale,
      width,
      height,
      top,
      left,
      targetWidth,
      targetHeight,
      topLeftRadius,
      topRightRadius,
      bottomRightRadius,
      bottomLeftRadius,
      firstElementChildPaddingTop,
      firstElementChildHeight,
      firstElementChildMinHeight,
    } = this.#state;
    return {
      progress,
      scale: pullScale,
      width: `${width}px`,
      height: `${height}px`,
      top: `${top}px`,
      left: `${left}px`,
      targetW: `${targetWidth}px`,
      targetH: `${targetHeight}px`,
      tlRadius: topLeftRadius,
      trRadius: topRightRadius,
      brRadius: bottomRightRadius,
      blRadius: bottomLeftRadius,
      firstPadding: `${firstElementChildPaddingTop}px`,
      firstHeight: `${firstElementChildHeight}px`,
      firstMinHeight: `${firstElementChildMinHeight}px`,
    };
  };

  render = () => {
    return html`
      <div class="placeholder"></div>
      <div ${this.#wrapperRef} class="wrapper">
        <div class="mask"></div>
        <div class="clip">
          <tap-pull-container
            ${this.#cardRef}
            part=${TapCardElement.card}
            class="card"
            pull-activate=${0.1}
            disable-scroll-mask
            ?disable-gesture=${!this.expand}
            @pull=${this.#onBodyPull}
            @pull-end=${this.#onBodyPullEnd}
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
      </div>
    `;
  };
}

export const Card = TapCardElement;
