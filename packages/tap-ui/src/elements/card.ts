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
import { addListener, styleMap } from '@mantou/gem/lib/utils';

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
  top: 'env(safe-area-inset-top, 0px)',
  bottom: 'env(safe-area-inset-bottom, 0px)',
};

const interpolateBorderRadius = (radius: string, target: string, progress: number) =>
  `calc(${radius} * ${1 - progress} + ${target} * ${progress})`;

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
    .clip {
      position: absolute;
      overflow: hidden;
      will-change: top, left, width, height;
    }
    .card {
      width: 100%;
      height: 100%;
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
    topLeftRadius: `calc(${theme.normalRound} * 3)`,
    topRightRadius: `calc(${theme.normalRound} * 3)`,
    bottomRightRadius: `calc(${theme.normalRound} * 3)`,
    bottomLeftRadius: `calc(${theme.normalRound} * 3)`,
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
    return this.#animate(
      0,
      1,
      (value) => this.#state({ progress: progress * (1 - value), pullScale: pullScale + (1 - pullScale) * value }),
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
    const titlebarHeight = Number.parseFloat(computedStyle.getPropertyValue('--titlebar-area-height'));
    const wrapperTop = Number.isFinite(titlebarHeight) ? titlebarHeight : 0;
    this.#state({
      progress: 0,
      pullScale: 1,
      width,
      height,
      top: top - wrapperTop,
      left,
      targetWidth: innerWidth,
      targetHeight: Math.max(1, innerHeight - wrapperTop),
      ...this.#getBorderRadius(computedStyle),
    });
    pageStore({ shouldDim: (this.expand = true) });

    await new Promise(requestAnimationFrame);
    const wrapper = this.#wrapperRef.value?.getBoundingClientRect();
    if (!this.expand || !wrapper) return;
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

  render = () => {
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
    } = this.#state;
    const currentWidth = width + (targetWidth - width) * progress;
    const currentHeight = height + (targetHeight - height) * progress;
    const currentLeft = left * (1 - progress);
    const currentTop = top * (1 - progress);
    const cardStyle = this.expand
      ? styleMap({
          transform: `scale(${pullScale})`,
          borderTopLeftRadius: interpolateBorderRadius(topLeftRadius, SAFE_AREA_INSET.top, progress),
          borderTopRightRadius: interpolateBorderRadius(topRightRadius, SAFE_AREA_INSET.top, progress),
          borderBottomRightRadius: interpolateBorderRadius(bottomRightRadius, SAFE_AREA_INSET.bottom, progress),
          borderBottomLeftRadius: interpolateBorderRadius(bottomLeftRadius, SAFE_AREA_INSET.bottom, progress),
        })
      : styleMap({
          borderTopLeftRadius: topLeftRadius,
          borderTopRightRadius: topRightRadius,
          borderBottomRightRadius: bottomRightRadius,
          borderBottomLeftRadius: bottomLeftRadius,
        });

    return html`
      <div style=${this.expand ? styleMap({ width: `${width}px`, height: `${height}px` }) : ''}></div>
      <div ${this.#wrapperRef} class="wrapper">
        <div
          class="mask"
          style=${styleMap({ opacity: progress })}
        ></div>
        <div
          class="clip"
          style=${
            this.expand
              ? styleMap({
                  top: `${currentTop}px`,
                  left: `${currentLeft}px`,
                  width: `${currentWidth}px`,
                  height: `${currentHeight}px`,
                  borderTopLeftRadius: interpolateBorderRadius(topLeftRadius, SAFE_AREA_INSET.top, progress),
                  borderTopRightRadius: interpolateBorderRadius(topRightRadius, SAFE_AREA_INSET.top, progress),
                  borderBottomRightRadius: interpolateBorderRadius(bottomRightRadius, SAFE_AREA_INSET.bottom, progress),
                  borderBottomLeftRadius: interpolateBorderRadius(bottomLeftRadius, SAFE_AREA_INSET.bottom, progress),
                })
              : ''
          }
        >
          <tap-pull-container
            ${this.#cardRef}
            part=${TapCardElement.card}
            class="card"
            style=${cardStyle}
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
              style=${styleMap({ opacity: progress })}
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
