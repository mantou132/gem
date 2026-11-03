import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  boolattribute,
  connectStore,
  customElement,
  effect,
  emitter,
  mounted,
  numattribute,
  part,
  shadow,
  slot,
  state,
  template,
} from '@mantou/gem/lib/decorators';
import { createRef, createState, css, html } from '@mantou/gem/lib/element';
import { createStore } from '@mantou/gem/lib/store';
import { addListener, classMap, styleMap } from '@mantou/gem/lib/utils';

import { icons } from '../lib/icons';
import { clamp } from '../lib/number';
import { theme } from '../lib/theme';
import { TapVisibleBaseElement } from './base/visible';
import type { EndEventDetail, PanEventDetail, SwipeEventDetail } from './gesture';
import type { TapNavbarElement } from './navbar';
import { Stack } from './stack';
import { TapSwipeoutElement } from './swipeout';

import './gesture';
import './use';

export const pageStore = createStore({
  shouldDim: false,
  shouldFullscreen: false,
});

/**Pull distance that triggers refresh */
const PULL_THRESHOLD = 72;
/**Held height while refreshing */
const PULL_HOLD = 44;
const PULL_MAX = 96;

const style = css`
  :host(:where(:not([hidden]))) {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: ${theme.backgroundColor};
    color: ${theme.textColor};
  }
  /* Insets from an ancestor page, e.g. the tabbar of a root page */
  :host {
    --outer-inset-top: var(--page-inset-top, 0px);
    --outer-inset-bottom: var(--page-inset-bottom, 0px);
  }
  /* In the header so it stays below it while content scrolls and leaves with it */
  .progress {
    position: absolute;
    inset-block-start: 100%;
    inset-inline: 0;
    height: 2px;
    background: ${theme.primaryColor};
    transform-origin: left;
    pointer-events: none;

    scale: 0 1;
    transition: scale 300ms linear;
    will-change: scale;
  }

  @media (prefers-reduced-motion: reduce) {
    .progress {
      transition: none;
    }
  }
  .header,
  .footer {
    position: absolute;
    inset-inline: 0;
    z-index: 2;
    /* will-change: opacity would make it a backdrop root, so the bars could not blur the content below */
    will-change: transform;
    transition:
      transform 350ms ${theme.timingFunction},
      inset-block 350ms ${theme.timingFunction};
  }
  .header {
    inset-block-start: var(--outer-inset-top);
  }
  .footer {
    inset-block-end: var(--outer-inset-bottom);
  }
  /* Scrolls under the header and footer, the insets keep content clear of them like iOS */
  /* No z-index: content stays below the bars, while an expanded card can still cover them */
  .main {
    --page-inset-top: calc(var(--outer-inset-top) + var(--header-height));
    --page-inset-bottom: calc(var(--outer-inset-bottom) + var(--footer-height));
    position: absolute;
    inset: 0;
    padding-block: var(--page-inset-top) var(--page-inset-bottom);
    scroll-padding-block: var(--page-inset-top) var(--page-inset-bottom);
  }
  :host([floatheader]) .main {
    --page-inset-top: var(--outer-inset-top);
  }
  /* Enabled once fullscreen toggles, so the first measurement does not slide the content */
  .main.animate-insets {
    transition: padding-block 350ms ${theme.timingFunction};
  }
  /* Content already runs under the bars, so moving them away is enough */
  :host(:is(:state(dim), :state(fullscreen))) .header {
    transform: translateY(-100%);
    pointer-events: none;
  }
  :host(:is(:state(dim), :state(fullscreen))) .footer {
    transform: translateY(100%);
    pointer-events: none;
  }
  /* Content at the top, e.g. a focused searchbar, covers the safe area itself */
  :host(:state(fullscreen)) .main {
    --page-inset-top: var(--outer-inset-top);
    --page-inset-bottom: var(--outer-inset-bottom);
  }
  /* Pull moves the slotted content itself, so the main layout stays untouched */
  /* Only while pulled, otherwise it would override the transitions of the content */
  .pulled ::slotted(*) {
    translate: 0 var(--pull);
    transition: translate 200ms ${theme.timingFunction};
  }
  /* The gap above the content, clips the indicator so it never shows through the header */
  .refresh {
    position: absolute;
    inset-block-start: var(--page-inset-top);
    inset-inline: 0;
    height: var(--pull, 0px);
    overflow: hidden;
    transition: height 200ms ${theme.timingFunction};
  }
  /* Centered once the gap fits */
  .refresh-icon {
    position: absolute;
    inset-block-start: 0;
    left: 50%;
    width: 1.25em;
    height: 1.25em;
    color: ${theme.describeColor};
    translate: -50% min(calc(var(--pull, 0px) - 1.25em), calc(var(--pull, 0px) / 2 - 0.625em));
    transition: translate 200ms ${theme.timingFunction};
  }
  .dragging ::slotted(*),
  .dragging :is(.refresh, .refresh-icon) {
    transition: none;
  }
  .gesture {
    position: absolute;
    inset-block: 0;
    inset-inline-start: 0;
    width: 1.25em;
    z-index: 1;
  }
`;

@customElement('tap-page')
@shadow()
@adoptedStyle(style)
@connectStore(pageStore)
export class TapPageElement extends TapVisibleBaseElement {
  @slot @part static header: string;
  @slot @part static footer: string;
  @part static main: string;
  @part static refresh: string;

  /**
   * Header overlays content; navbar stays transparent until content scrolls
   * You need to manually handle the top safe area inset for the page content.
   */
  @boolattribute floatheader: boolean;
  /**Enable pull-to-refresh on the main scroll area */
  @boolattribute refreshable: boolean;
  @boolattribute loading: boolean;
  @boolattribute disableNavigation: boolean;
  @boolattribute trackVisibility = true;
  @numattribute pullThreshold: number;

  /**
   * Fired when pull exceeds the threshold.
   * Call `detail()` (done) when loading finishes so the indicator can dismiss.
   */
  @emitter refresh: Emitter<() => void>;
  @emitter navigationGesture: Emitter<{ pan?: PanEventDetail; swipe?: SwipeEventDetail; end?: PointerEvent }>;

  @state dim: boolean;
  @state fullscreen: boolean;

  #state = createState({
    scrolled: false,
    pull: 0,
    dragging: false,
    refreshing: false,
    rotate: 0,
    progress: 0,
    showProgress: false,
    headerHeight: 0,
    footerHeight: 0,
    animateInsets: false,
    pulled: false,
  });
  #mainRef = createRef<HTMLElement>();
  #headerSlotRef = createRef<HTMLSlotElement>();
  #iconRef = createRef<HTMLElement>();
  #headerRef = createRef<HTMLElement>();
  #footerRef = createRef<HTMLElement>();

  get #pullThreshold() {
    return this.pullThreshold || PULL_THRESHOLD;
  }

  /**The scroll container of the page content, e.g. to keep a chat scrolled to the bottom */
  get scrollElement() {
    return this.#mainRef.value;
  }

  /**Measures the bars directly, the main insets are only set after the first resize observation */
  get contentHeight() {
    const header = this.floatheader ? 0 : this.#headerRef.value?.offsetHeight || 0;
    const footer = this.#footerRef.value?.offsetHeight || 0;
    const mainEl = this.#mainRef.value;
    let main = 0;
    if (mainEl) {
      const mainRect = mainEl.getBoundingClientRect();
      const paddingTop = parseFloat(getComputedStyle(mainEl).paddingTop);
      const paddingBottom = parseFloat(getComputedStyle(mainEl).paddingBottom);
      const mainElements = [...this.children].filter((el) => !el.slot && el instanceof HTMLElement) as HTMLElement[];
      let maxBottom = 0;
      for (const el of mainElements) {
        const rect = el.getBoundingClientRect();
        const marginBottom = parseFloat(getComputedStyle(el).marginBottom) || 0;
        const bottom = rect.bottom + marginBottom;
        if (bottom > maxBottom) maxBottom = bottom;
      }
      if (maxBottom > 0) {
        main = maxBottom - mainRect.top - paddingTop + mainEl.scrollTop;
      } else {
        main = mainEl.scrollHeight - paddingTop - paddingBottom;
      }
    }
    return Math.ceil(header + footer + main);
  }

  #pullRotate = (pull: number) => Math.min(180, (pull / this.#pullThreshold) * 180);

  #forward = (type: string, evt: CustomEvent) => {
    if (this.disableNavigation) return this.navigationGesture({ [type]: evt.detail });
    this.dispatchEvent(new CustomEvent(type, { detail: evt.detail, bubbles: true, composed: true }));
  };

  #damp = (dy: number) => {
    const max = Math.max(PULL_MAX, this.#pullThreshold * 1.33);
    return clamp(0, dy * 0.45, max);
  };

  #doneRefresh = () => {
    if (!this.#state.refreshing) return;
    this.#state({ refreshing: false, pull: 0 });
  };

  #startRefresh = () => {
    if (this.#state.refreshing) return;
    this.#state({ refreshing: true, pull: PULL_HOLD });
    this.refresh(this.#doneRefresh);
  };

  @effect((i) => [i.#state.refreshing])
  #spinIcon = () => {
    if (!this.#state.refreshing) return;
    const el = this.#iconRef.value!;
    const from = this.#state.rotate;
    const duration = 800;
    const anim = el.animate([{ transform: `rotate(${from}deg)` }, { transform: `rotate(${from + 360}deg)` }], {
      duration,
      iterations: Infinity,
      easing: 'linear',
    });
    return () => {
      const t = Number(anim.currentTime ?? 0);
      anim.cancel();
      if (!this.refreshable) return;
      const angle = (from + ((t % duration) / duration) * 360) % 360;
      this.#state({ rotate: angle });
    };
  };

  #onPull = (evt: CustomEvent<{ distance: number }>) => {
    this.#closeSwipeout();
    const pull = this.#damp(evt.detail.distance);
    this.#state({ pull, dragging: true, rotate: this.#pullRotate(pull) });
  };

  #onPullEnd = (evt: CustomEvent<{ distance: number }>) => {
    this.#state({ pull: 0, dragging: false });
    if (this.#damp(evt.detail.distance) >= this.#pullThreshold) this.#startRefresh();
  };

  /** Stays pulled until the content settles back */
  @effect((i) => [i.#state.pull])
  #settle = () => {
    if (this.#state.pull) {
      this.#state({ pulled: true });
      return;
    }
    const timer = setTimeout(() => this.#state({ pulled: false }), 200);
    return () => clearTimeout(timer);
  };

  @effect((i) => [i.refreshable])
  #watchPull = () => {
    if (!this.refreshable) this.#state({ pull: 0, dragging: false, refreshing: false, rotate: 0 });
  };

  #syncHeaderTransparent = () => {
    const transparent = this.floatheader && !this.#state.scrolled;
    this.#headerSlotRef.value?.assignedElements().forEach((el) => {
      (el as TapNavbarElement).transparent = transparent;
    });
  };

  /** Like iOS, scrolling or pulling closes an open swipeout without interrupting the gesture */
  #closeSwipeout = () => {
    TapSwipeoutElement.activeSwipeout?.close();
  };

  @effect((i) => [i.floatheader, i.#state.scrolled])
  #watchHeader = () => {
    this.#syncHeaderTransparent();
    const slot = this.#headerSlotRef.value!;
    return addListener(slot, 'slotchange', this.#syncHeaderTransparent);
  };

  @effect(() => [pageStore.shouldDim])
  #watchExpandable = () => {
    if (Stack.inCurrentStack(this)) this.dim = !!pageStore.shouldDim;
  };

  @effect(() => [pageStore.shouldFullscreen])
  #watchMainFullscreen = () => {
    if (!Stack.inCurrentStack(this)) return;
    const fullscreen = !!pageStore.shouldFullscreen;
    if (fullscreen !== this.fullscreen) this.#state({ animateInsets: true });
    this.fullscreen = fullscreen;
  };

  @mounted()
  #observeBars = () => {
    const header = this.#headerRef.value!;
    const ro = new ResizeObserver((entries) => {
      entries.forEach(({ target, borderBoxSize: [{ blockSize }] }) => {
        this.#state(target === header ? { headerHeight: blockSize } : { footerHeight: blockSize });
      });
    });
    ro.observe(header);
    ro.observe(this.#footerRef.value!);
    return () => ro.disconnect();
  };

  @effect((i) => [i.floatheader])
  #watchScroll = () => {
    if (!this.floatheader) {
      this.#state({ scrolled: false });
      return;
    }
    const el = this.#mainRef.value!;
    const onScroll = () => this.#state({ scrolled: el.scrollTop > 0 });
    onScroll();
    return addListener(el, 'scroll', onScroll, { passive: true });
  };

  @effect((i) => [i.loading])
  #watchLoading = () => {
    if (this.loading) {
      this.#state({ progress: 0, showProgress: true });
      const timer = setInterval(() => {
        const progress = this.#state.progress;
        this.#state({ progress: progress + (95 - progress) * 0.1 });
      }, 100);
      return () => clearInterval(timer);
    }
    if (!this.#state.showProgress) return;
    this.#state({ progress: 100 });
    const timer = setTimeout(() => this.#state({ showProgress: false }), 300);
    return () => clearTimeout(timer);
  };

  @template()
  #content = () => {
    const { pull, dragging, refreshing, rotate, headerHeight, footerHeight, animateInsets, pulled } = this.#state;
    return html`
      <div ${this.#headerRef} class="header" part=${TapPageElement.header}>
        <slot ${this.#headerSlotRef} name=${TapPageElement.header}></slot>
        <div
          v-if=${this.#state.showProgress}
          class="progress"
          style=${styleMap({ scale: `${this.#state.progress / 100} 1` })}
        ></div>
      </div>
      <tap-pull-container
        ${this.#mainRef}
        class=${classMap({ main: true, dragging, pulled, 'animate-insets': animateInsets })}
        part=${TapPageElement.main}
        style=${styleMap({
          '--pull': pull ? `${pull}px` : undefined,
          '--header-height': `${headerHeight}px`,
          '--footer-height': `${footerHeight}px`,
        })}
        disable-scroll-mask
        ?disable-gesture=${!this.refreshable || refreshing || pageStore.shouldDim}
        @pull=${this.#onPull}
        @pull-end=${this.#onPullEnd}
        @scroll=${this.#closeSwipeout}
      >
        <div v-if=${this.refreshable} class="refresh">
          <tap-use
            ${this.#iconRef}
            class="refresh-icon"
            part=${TapPageElement.refresh}
            style=${styleMap({ transform: !refreshing && `rotate(${rotate}deg)` })}
            .element=${icons.refresh}
          ></tap-use>
        </div>
        <slot></slot>
      </tap-pull-container>
      <div ${this.#footerRef} class="footer" part=${TapPageElement.footer}>
        <slot name=${TapPageElement.footer}></slot>
      </div>
      <tap-gesture
        class="gesture"
        @pan=${(evt: CustomEvent<PanEventDetail>) => this.#forward('pan', evt)}
        @swipe=${(evt: CustomEvent<SwipeEventDetail>) => this.#forward('swipe', evt)}
        @end=${(evt: CustomEvent<EndEventDetail>) => this.#forward('end', evt)}
      ></tap-gesture>
    `;
  };
}
