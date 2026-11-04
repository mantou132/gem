import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  boolattribute,
  customElement,
  effect,
  emitter,
  mounted,
  numattribute,
  part,
  property,
  shadow,
  state,
  template,
  willMount,
} from '@mantou/gem/lib/decorators';
import { createRef, createState, css, GemElement, html } from '@mantou/gem/lib/element';
import { styleMap } from '@mantou/gem/lib/utils';

import { setBodyInert } from '../lib/element';
import { clamp } from '../lib/number';
import { theme, themeStore } from '../lib/theme';
import { DyPromise } from '../lib/utils';
import type { PanEventDetail, PinchEventDetail, SwipeEventDetail, TapGestureElement } from './gesture';
import type { PullEndEventDetail, PullEventDetail } from './pull-container';

import './gesture';
import './pull-container';

/** Match card / sheet timing */
const DURATION = 350;
const DURATION_MIN = 140;
const CLOSE_DISTANCE = 100;
const SWIPE_ACTIVATE_SPEED = 0.5;
const MAX_SCALE = 4;
/** Single tap waits for a possible second tap, like iOS Photos */
const DOUBLE_TAP_DELAY = 250;
/** Movement ratio when panning beyond the edge */
const RUBBER_BAND = 0.3;
/** Inertia distance of a pan swipe, in ms of the swipe speed */
const MOMENTUM = 200;

const style = css`
  :host {
    position: fixed;
    z-index: ${theme.popupZIndex};
    inset: 0;
    color: #fff;
    user-select: none;
  }
  :host(:state(closing)) {
    pointer-events: none;
  }
  .mask {
    position: absolute;
    inset: 0;
    background: #000;
  }
  .viewport {
    position: absolute;
    inset: 0;
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 100%;
    margin: 0;
    padding: 0;
    outline: none;
    overflow-x: auto;
    overscroll-behavior: contain;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
  }
  .item {
    min-width: 0;
    height: 100%;
    scroll-snap-align: start;
    scroll-snap-stop: always;
  }
  .photo {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    /* 和来源的 inset() 插值，不能是 none */
    clip-path: inset(0px);
  }
  .counter,
  .caption {
    position: absolute;
    left: 0;
    right: 0;
    text-align: center;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
    pointer-events: none;
  }
  .counter {
    top: calc(1em + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)));
    font-variant-numeric: tabular-nums;
  }
  .caption {
    bottom: calc(1em + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)));
    padding: 0 1em;
  }
`;

export interface PhotoItem {
  src: string;
  alt?: string;
  /** Shown until `src` is loaded, usually the cached thumbnail */
  thumbnail?: string;
  /**
   * Element to zoom from/to when opening/closing,
   * use a function when the element may be re-rendered, e.g. virtual list
   */
  origin?: Element | (() => Element | null | undefined);
}

export interface PhotoBrowserOptions {
  items: PhotoItem[];
  index?: number;
  /** Scroll the page so that the origin of the current photo is visible */
  scrollToOrigin?: boolean;
}

@customElement('tap-photo-browser')
@adoptedStyle(style)
@shadow({ delegatesFocus: true })
export class TapPhotoBrowserElement extends GemElement {
  @part static photo: string;
  @part static counter: string;
  @part static caption: string;

  @numattribute index: number;
  @boolattribute scrollToOrigin: boolean;
  @property items?: PhotoItem[];

  @emitter close: Emitter;

  @state closing: boolean;

  /** Opens the browser; settles when dismissed (tap / pull down / CloseWatcher). */
  static open({ items, index = 0, scrollToOrigin = false }: PhotoBrowserOptions) {
    const browser = new this();
    browser.items = items;
    browser.index = index;
    browser.scrollToOrigin = scrollToOrigin;
    const restoreInert = setBodyInert(browser);
    document.body.append(browser);
    return DyPromise.new<void, { browser: TapPhotoBrowserElement }>(
      (res) => {
        browser.addEventListener('close', () => res());
      },
      { browser },
    ).finally(async () => {
      browser.closing = true;
      await browser.#closeAnimate();
      restoreInert();
      browser.remove();
    });
  }

  #viewportRef = createRef<HTMLElement>();
  #state = createState({ current: 0, loaded: new Set<number>(), pull: 0, scale: 1, x: 0, y: 0 });
  /** Pulled, panned or pinched in this touch, the click should be ignored */
  #gestured = false;
  #pinched = false;
  #pinchCenter?: PinchEventDetail;
  #swipe?: SwipeEventDetail;
  #tapTimer?: ReturnType<typeof setTimeout>;

  get #photo() {
    return this.#viewportRef.value?.children[this.#state.current]?.firstElementChild as HTMLImageElement | undefined;
  }

  get #origin() {
    const origin = this.items?.[this.#state.current]?.origin;
    return typeof origin === 'function' ? origin() : origin;
  }

  get #zoomed() {
    const { scale, x, y } = this.#state;
    return scale !== 1 || !!x || !!y;
  }

  get #photoTransform() {
    const { pull, scale, x, y } = this.#state;
    if (this.#zoomed) return `translate(${x}px, ${y}px) scale(${scale})`;
    if (pull) return `translateY(${pull}px) scale(${clamp(0.4, 1 - pull / innerHeight, 1)})`;
  }

  get #overlays() {
    return [...this.shadowRoot!.querySelectorAll('.mask, .counter, .caption')];
  }

  #animationOptions: KeyframeAnimationOptions = { duration: DURATION, easing: themeStore.timingFunction };

  /** Animate from the current computed style, so it can interrupt a running animation or a pull */
  #animateTo = (ele: Element, keyframe: Keyframe, options?: KeyframeAnimationOptions) => {
    const { transform, clipPath, opacity } = getComputedStyle(ele);
    ele.getAnimations().forEach((animation) => animation.cancel());
    return ele.animate([{ transform, clipPath, opacity }, keyframe], { ...this.#animationOptions, ...options })
      .finished;
  };

  /** Box of the photo and its displayed size with `object-fit: contain` */
  #getContentRect = (photo: HTMLImageElement) => {
    // 取父元素尺寸，不受 transform 影响
    const box = photo.parentElement!.getBoundingClientRect();
    const ratio = photo.naturalWidth / photo.naturalHeight || 1;
    const w = Math.min(box.width, box.height * ratio);
    return { box, w, h: w / ratio, cx: box.left + box.width / 2, cy: box.top + box.height / 2 };
  };

  /** Keyframe that covers the origin element with the photo, `undefined` when origin is not visible */
  #getOriginKeyframe = (photo: HTMLImageElement, origin?: Element | null): Keyframe | undefined => {
    const rect = origin?.getBoundingClientRect();
    if (!rect?.width || !photo.naturalWidth || rect.bottom < 0 || rect.top > innerHeight) return;
    const { box, w, h, cx, cy } = this.#getContentRect(photo);
    // 等比缩放覆盖来源元素，多余部分用 clip-path 裁掉，模拟 `object-fit: cover`
    const scale = Math.max(rect.width / w, rect.height / h);
    const x = rect.left + rect.width / 2 - cx;
    const y = rect.top + rect.height / 2 - cy;
    const insetX = (box.width - rect.width / scale) / 2;
    const insetY = (box.height - rect.height / scale) / 2;
    return {
      transform: `translate(${x}px, ${y}px) scale(${scale})`,
      clipPath: `inset(${insetY}px ${insetX}px)`,
    };
  };

  #closeAnimate = async () => {
    const photo = this.#photo;
    const origin = this.#origin;
    const to = photo && this.#getOriginKeyframe(photo, origin);
    // 函数形式的来源元素可能已被重新渲染，需要重新隐藏
    origin?.animate({ visibility: 'hidden' }, this.#animationOptions);
    await Promise.all([
      ...this.#overlays.map((e) => this.#animateTo(e, { opacity: 0 }, { fill: 'forwards' })),
      photo && this.#animateTo(photo, to || { transform: 'scale(0.8)', opacity: 0 }, { fill: 'forwards' }),
    ]);
  };

  #onScroll = () => {
    const { scrollLeft, clientWidth } = this.#viewportRef.value!;
    const current = Math.round(scrollLeft / clientWidth);
    if (current !== this.#state.current) this.#state({ current, scale: 1, x: 0, y: 0 });
  };

  /** Max translation that keeps the edges of the scaled photo outside the box */
  #getBounds = (scale: number) => {
    const { box, w, h } = this.#getContentRect(this.#photo!);
    return { x: Math.max(0, (w * scale - box.width) / 2), y: Math.max(0, (h * scale - box.height) / 2) };
  };

  #zoomTo = (scale: number, x: number, y: number) => {
    const bounds = this.#getBounds(scale);
    const target = { scale, x: clamp(-bounds.x, x, bounds.x), y: clamp(-bounds.y, y, bounds.y) };
    this.#animateTo(this.#photo!, { transform: `translate(${target.x}px, ${target.y}px) scale(${target.scale})` });
    this.#state(target);
  };

  #onPointerDown = (evt: PointerEvent) => {
    if (!evt.isPrimary) return;
    this.#gestured = false;
    this.#pinched = false;
  };

  #onPull = ({ detail }: CustomEvent<PullEventDetail>) => {
    if (this.#pinched) return;
    this.#gestured = true;
    this.#state({ pull: detail.distance });
  };

  #onPullEnd = ({ detail: { distance, swipe } }: CustomEvent<PullEndEventDetail>) => {
    if (this.#pinched) return;
    if (distance > CLOSE_DISTANCE || (swipe?.direction === 'bottom' && swipe.speed > SWIPE_ACTIVATE_SPEED)) {
      this.close(null);
      return;
    }
    const options = { duration: DURATION_MIN };
    this.#animateTo(this.#photo!, { transform: 'none' }, options);
    this.#overlays.forEach((e) => this.#animateTo(e, { opacity: 1 }, options));
    this.#state({ pull: 0 });
  };

  // 围绕双指中心缩放，双指一起移动时跟随平移
  #onPinch = ({ detail }: CustomEvent<PinchEventDetail>) => {
    this.#gestured = this.#pinched = true;
    const { scale, x, y } = this.#state;
    const { cx, cy } = this.#getContentRect(this.#photo!);
    const last = this.#pinchCenter || detail;
    this.#pinchCenter = detail;
    const newScale = clamp(0.5, scale * detail.scale, MAX_SCALE * 1.5);
    const ratio = newScale / scale;
    const tx = x + detail.x - last.x;
    const ty = y + detail.y - last.y;
    this.#state({
      pull: 0,
      scale: newScale,
      x: ratio * tx + (1 - ratio) * (detail.x - cx),
      y: ratio * ty + (1 - ratio) * (detail.y - cy),
    });
  };

  #onPan = (evt: CustomEvent<PanEventDetail>) => {
    const { scale, x, y } = this.#state;
    // 双指时由 pinch 处理
    if (scale <= 1 || (evt.currentTarget as TapGestureElement).movesMap.size > 1) return;
    this.#gestured = true;
    const bounds = this.#getBounds(scale);
    const move = (value: number, delta: number, max: number) =>
      value + (Math.abs(value) > max ? delta * RUBBER_BAND : delta);
    this.#state({ x: move(x, evt.detail.x, bounds.x), y: move(y, evt.detail.y, bounds.y) });
  };

  #onSwipe = ({ detail }: CustomEvent<SwipeEventDetail>) => {
    this.#swipe = detail;
  };

  // 松手后缩放比例和位置回弹到范围内，平移带惯性
  #onGestureEnd = () => {
    const swipe = this.#swipe;
    this.#pinchCenter = undefined;
    this.#swipe = undefined;
    if (!this.#zoomed) return;
    const { scale, x, y } = this.#state;
    const targetScale = clamp(1, scale, MAX_SCALE);
    const ratio = targetScale / scale;
    const distance = swipe && !this.#pinched ? swipe.speed * MOMENTUM : 0;
    const dx = swipe?.direction === 'left' ? -distance : swipe?.direction === 'right' ? distance : 0;
    const dy = swipe?.direction === 'top' ? -distance : swipe?.direction === 'bottom' ? distance : 0;
    this.#zoomTo(targetScale, (x + dx) * ratio, (y + dy) * ratio);
  };

  #toggleZoom = ({ clientX, clientY }: MouseEvent) => {
    if (this.#zoomed) {
      this.#zoomTo(1, 0, 0);
      return;
    }
    const { box, w, h, cx, cy } = this.#getContentRect(this.#photo!);
    // 至少放大到铺满屏幕
    const scale = clamp(2, Math.max(box.width / w, box.height / h), MAX_SCALE);
    this.#zoomTo(scale, (1 - scale) * (clientX - cx), (1 - scale) * (clientY - cy));
  };

  #onClick = (evt: MouseEvent) => {
    if (this.#gestured) return;
    if (this.#tapTimer) {
      clearTimeout(this.#tapTimer);
      this.#tapTimer = undefined;
      this.#toggleZoom(evt);
      return;
    }
    this.#tapTimer = setTimeout(() => {
      this.#tapTimer = undefined;
      this.close(null);
    }, DOUBLE_TAP_DELAY);
  };

  @willMount()
  #initCurrent = () => {
    this.#state({ current: clamp(0, this.index, (this.items?.length || 1) - 1) });
  };

  @mounted()
  #openAnimate = async () => {
    const viewport = this.#viewportRef.value!;
    viewport.scrollLeft = this.#state.current * viewport.clientWidth;
    viewport.focus();
    this.#overlays.forEach((e) => e.animate([{ opacity: 0 }, { opacity: 1 }], this.#animationOptions));
    const photo = this.#photo!;
    // 尺寸确定后才能计算来源位置
    const loaded = await photo.decode().then(
      () => true,
      () => false,
    );
    if (this.closing) return;
    const from = loaded && this.#getOriginKeyframe(photo, this.#origin);
    photo.animate(
      [from || { transform: 'scale(0.8)', opacity: 0 }, { transform: 'none', clipPath: 'inset(0px)' }],
      this.#animationOptions,
    );
  };

  @effect()
  #closeWatcher = () => {
    if (typeof CloseWatcher === 'undefined') return;
    const watcher = new CloseWatcher();
    watcher.addEventListener('close', () => this.close(null));
    return () => watcher.destroy();
  };

  // 来源元素被浏览器中的图片替代，避免下拉/关闭时同时看到两张
  @effect((i) => [i.#state.current])
  #hideOrigin = (_: [number], oldDeps?: [number]) => {
    const origin = this.#origin;
    // 翻页时背后页面被遮罩挡住，瞬间滚动不会被看到；打开时遮罩还透明，不滚动
    if (this.scrollToOrigin && oldDeps)
      origin?.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'nearest' });
    const animation = origin?.animate({ visibility: 'hidden' }, { fill: 'forwards' });
    return () => animation?.cancel();
  };

  @effect((i) => [i.#state.current])
  #preload = () => {
    const { current, loaded } = this.#state;
    [current - 1, current, current + 1].forEach((index) => {
      const item = this.items?.[index];
      if (!item?.thumbnail || loaded.has(index)) return;
      const img = new Image();
      img.addEventListener('load', () => this.#state({ loaded: new Set(this.#state.loaded).add(index) }));
      img.src = item.src;
    });
  };

  @template()
  #render = () => {
    const { current, loaded, pull } = this.#state;
    const items = this.items || [];
    const alt = items[current]?.alt;
    const zoomed = this.#zoomed;
    const opacityStyle = styleMap({ opacity: clamp(0, 1 - pull / (innerHeight / 2), 1) });
    return html`
      <div class="mask" style=${opacityStyle}></div>
      <tap-pull-container
        ${this.#viewportRef}
        class="viewport"
        tabindex="0"
        role="dialog"
        aria-modal="true"
        disable-scroll-mask
        detect-swipe
        ?disable-gesture=${zoomed}
        @scroll=${this.#onScroll}
        @click=${this.#onClick}
        @pull=${this.#onPull}
        @pull-end=${this.#onPullEnd}
      >
        ${items.map(
          ({ src, alt, thumbnail }, index) => html`
            <!-- 未缩放时横向交给原生滚动翻页，纵向交给 pull-container；放大后全部用于平移 -->
            <tap-gesture
              class="item"
              touch-action=${index === current && zoomed ? 'none' : 'pan-x'}
              @pointerdown=${this.#onPointerDown}
              @pinch=${this.#onPinch}
              @pan=${this.#onPan}
              @swipe=${this.#onSwipe}
              @end=${this.#onGestureEnd}
            >
              <img
                class="photo"
                part=${TapPhotoBrowserElement.photo}
                src=${!thumbnail || loaded.has(index) ? src : thumbnail}
                alt=${alt || ''}
                style=${styleMap({ transform: index === current ? this.#photoTransform : undefined })}
              />
            </tap-gesture>
          `,
        )}
      </tap-pull-container>
      <div v-if=${items.length > 1} class="counter" part=${TapPhotoBrowserElement.counter} style=${opacityStyle}>
        ${current + 1} / ${items.length}
      </div>
      <div v-if=${!!alt} class="caption" part=${TapPhotoBrowserElement.caption} style=${opacityStyle}>${alt}</div>
    `;
  };
}

export const PhotoBrowser = TapPhotoBrowserElement;
