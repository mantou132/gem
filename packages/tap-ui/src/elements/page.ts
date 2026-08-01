import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  boolattribute,
  connectStore,
  customElement,
  effect,
  emitter,
  part,
  shadow,
  slot,
  state,
  template,
} from '@mantou/gem/lib/decorators';
import { createRef, createState, css, GemElement, html } from '@mantou/gem/lib/element';
import { createStore } from '@mantou/gem/lib/store';
import { addListener, classMap, styleMap } from '@mantou/gem/lib/utils';

import { icons } from '../lib/icons';
import { theme } from '../lib/theme';
import type { PanEventDetail, SwipeEventDetail } from './gesture';
import type { TapNavbarElement } from './navbar';
import { Stack } from './stack';

import './gesture';
import './use';

export const pageStore = createStore({ shouldDim: false });

/**Pull distance that triggers refresh */
const PULL_THRESHOLD = 52;
/**Held height while refreshing */
const PULL_HOLD = 44;
const PULL_MAX = 80;

const style = css`
  :host(:where(:not([hidden]))) {
    display: flex;
    flex-direction: column;
    position: absolute;
    inset: 0;
    overflow: hidden;
    box-sizing: border-box;
    background: ${theme.backgroundColor};
    color: ${theme.textColor};
  }
  .header,
  .footer {
    position: relative;
    flex-shrink: 0;
    z-index: 2;
    will-change: opacity, transform;
    transition: all ${350}ms ${theme.timingFunction};
  }
  :host([floatheader]) .header {
    position: absolute;
    inset-inline: 0;
    inset-block-start: 0;
  }
  .main {
    position: relative;
    z-index: 0;
    flex: 1;
    min-height: 0;
  }
  :host(:state(dim)) {
    .header,
    .footer {
      opacity: 0;
      pointer-events: none;
    }
    .header {
      transform: translateY(-100%);
    }
    .footer {
      transform: translateY(100%);
    }
    .main {
      z-index: 3;
    }
  }
  .refresh {
    position: relative;
    overflow: hidden;
    height: 0;
    color: ${theme.describeColor};
    transition: height 200ms ${theme.timingFunction};
  }
  .refresh.dragging {
    transition: none;
  }
  .refresh .icon {
    position: absolute;
    left: 50%;
    bottom: max(0px, calc(50% - 0.625em));
    translate: -50% 0;
    width: 1.25em;
    height: 1.25em;
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
export class TapPageElement extends GemElement {
  @slot @part static header: string;
  @slot @part static footer: string;
  @part static main: string;
  @part static refresh: string;

  /**Header overlays content; navbar stays transparent until content scrolls */
  @boolattribute floatheader: boolean;
  /**Enable pull-to-refresh on the main scroll area */
  @boolattribute refreshable: boolean;

  /**
   * Fired when pull exceeds the threshold.
   * Call `detail()` (done) when loading finishes so the indicator can dismiss.
   */
  @emitter refresh: Emitter<() => void>;
  @state dim: boolean;

  #state = createState({
    scrolled: false,
    pull: 0,
    dragging: false,
    refreshing: false,
    rotate: 0,
  });
  #mainRef = createRef<HTMLElement>();
  #headerSlotRef = createRef<HTMLSlotElement>();
  #iconRef = createRef<HTMLElement>();

  #pullRotate = (pull: number) => Math.min(180, (pull / PULL_THRESHOLD) * 180);

  #forward = (type: string, evt: CustomEvent) => {
    this.dispatchEvent(new CustomEvent(type, { detail: evt.detail, bubbles: true, composed: true }));
  };

  #damp = (dy: number) => Math.min(PULL_MAX, Math.max(0, dy * 0.45));

  #doneRefresh = () => {
    if (!this.#state.refreshing) return;
    this.#state({ refreshing: false, pull: 0, dragging: false });
  };

  #startRefresh = () => {
    if (this.#state.refreshing) return;
    this.#state({ refreshing: true, pull: PULL_HOLD, dragging: false });
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
    const pull = this.#damp(evt.detail.distance);
    this.#state({ pull, dragging: true, rotate: this.#pullRotate(pull) });
  };

  #onPullEnd = (evt: CustomEvent<{ distance: number }>) => {
    const pull = this.#damp(evt.detail.distance);
    this.#state({ pull, dragging: false });
    if (pull >= PULL_THRESHOLD) this.#startRefresh();
    else this.#state({ pull: 0 });
  };

  @effect((i) => [i.refreshable, i.#state.refreshing])
  #watchPull = () => {
    if (!this.refreshable) this.#state({ pull: 0, dragging: false, refreshing: false, rotate: 0 });
  };

  #syncHeaderTransparent = () => {
    const transparent = this.floatheader && !this.#state.scrolled;
    this.#headerSlotRef.value?.assignedElements().forEach((el) => {
      (el as TapNavbarElement).transparent = transparent;
    });
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

  @template()
  #content = () => {
    const { pull, dragging, refreshing, rotate } = this.#state;
    const height = refreshing ? Math.max(pull, PULL_HOLD) : pull;
    return html`
      <div class="header" part=${TapPageElement.header}>
        <slot ${this.#headerSlotRef} name=${TapPageElement.header}></slot>
      </div>
      <tap-pull-container
        ${this.#mainRef}
        class="main"
        part=${TapPageElement.main}
        disable-scroll-mask
        ?disable-gesture=${!this.refreshable || refreshing}
        @pull=${this.#onPull}
        @pull-end=${this.#onPullEnd}
      >
        <div
          class=${classMap({ refresh: true, dragging })}
          part=${TapPageElement.refresh}
          style=${styleMap({ height: this.refreshable && height > 0 ? `${height}px` : '0px' })}
        >
          <tap-use
            ${this.#iconRef}
            class="icon"
            style=${styleMap({ transform: !refreshing && `rotate(${rotate}deg)` })}
            .element=${icons.refresh}
          ></tap-use>
        </div>
        <slot></slot>
      </tap-pull-container>
      <div class="footer" part=${TapPageElement.footer}>
        <slot name=${TapPageElement.footer}></slot>
      </div>
      <tap-gesture
        class="gesture"
        @pan=${(evt: CustomEvent<PanEventDetail>) => this.#forward('pan', evt)}
        @swipe=${(evt: CustomEvent<SwipeEventDetail>) => this.#forward('swipe', evt)}
        @end=${(evt: CustomEvent) => this.#forward('end', evt)}
      ></tap-gesture>
    `;
  };
}
