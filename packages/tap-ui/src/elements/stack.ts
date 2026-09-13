import {
  adoptedStyle,
  boolattribute,
  customElement,
  effect,
  mounted,
  numattribute,
  template,
  willMount,
} from '@mantou/gem/lib/decorators';
import type { TemplateResult } from '@mantou/gem/lib/element';
import { createRef, css, GemElement, html } from '@mantou/gem/lib/element';
import { history } from '@mantou/gem/lib/history';
import { connect, createStore } from '@mantou/gem/lib/store';
import { classMap, styleMap } from '@mantou/gem/lib/utils';

import { easeOutCubic } from '../lib/easing';
import { closestElement, containsElement } from '../lib/element';
import { clamp } from '../lib/number';
import { theme } from '../lib/theme';
import type { PanEventDetail, SwipeEventDetail } from './gesture';
import type { TapPageElement } from './page';

export type StackPushOptions = {
  content: string | number | TemplateResult | Element | Element[];
  /**Play enter animation; default `true` */
  animated?: boolean;
  /**Enable swipe-to-close; default `true` */
  gesture?: boolean;
  /**Push into history stack; default `true` */
  history?: boolean;
  canLeave?: () => boolean;
};

/** Match iOS / WeChat navigation timing */
const STACK_DURATION = 350;
const STACK_DURATION_MIN = 140;
/** Covered page rests at -30% width (iOS parallax) */
const STACK_PARALLAX = 0.3;

const style = css`
  :scope {
    position: absolute;
    inset: 0;
    z-index: 1;
    overflow: hidden;
  }
  :scope[auto-height] {
    display: block;
    position: relative;
  }
  :scope[inert] {
    pointer-events: none;
  }
  .page {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    background: ${theme.backgroundColor};
    will-change: transform;
  }
  .top {
    box-shadow: -2px 0 16px rgb(0 0 0 / 0.08);
  }
  /** Dim layer over the covered page; composited opacity instead of per-frame inherited custom props */
  .mask {
    position: absolute;
    inset: 0;
    background: black;
    opacity: 0;
    pointer-events: none;
    z-index: calc(${theme.popupZIndex} + 3);
    will-change: opacity;
  }
`;

@customElement('tap-stack')
@adoptedStyle(style)
export class TapStackElement extends GemElement {
  @boolattribute disableHistory: boolean;
  @boolattribute autoHeight: boolean;
  @numattribute maxHeight: number;

  static instance?: TapStackElement;

  static push(options: StackPushOptions) {
    const stack = (TapStackElement.instance ??= new TapStackElement());
    stack.push(options);
    if (!stack.isConnected) document.body.append(stack);
  }

  static replace(options: StackPushOptions) {
    const stack = (TapStackElement.instance ??= new TapStackElement());
    stack.replace(options);
    if (!stack.isConnected) document.body.append(stack);
  }

  static pop() {
    if (!TapStackElement.instance) return;
    TapStackElement.instance.pop();
  }

  static inCurrentStack(ele: HTMLElement) {
    const stack = closestElement(ele, TapStackElement);
    if (!stack) return false;
    const topPage = stack.#topPageRef.value;
    return !!topPage && containsElement(topPage, ele);
  }

  static getClosestStack(ele?: Element) {
    if (!ele) return;
    return closestElement<TapStackElement>(ele, 'tap-stack');
  }

  #topPageRef = createRef<HTMLElement>();
  #belowPageRef = createRef<HTMLElement>();
  #store = createStore({ pages: [] as StackPushOptions[], offset: 0 });
  #busy = false;
  #closeSpeed = 0;
  #pageHeights = new WeakMap<StackPushOptions, number>();

  #duration = (distance: number, width: number, speed = 0) => {
    if (speed > 0) {
      return clamp(STACK_DURATION_MIN, distance / speed, STACK_DURATION);
    }
    return clamp(STACK_DURATION_MIN, STACK_DURATION * (distance / (width || 1)), STACK_DURATION);
  };

  #getPageHeight = (page: StackPushOptions, el?: HTMLElement | null): number => {
    const cached = this.#pageHeights.get(page);
    if (cached) return cached;
    if (el) {
      const tapPage = (el.querySelector('tap-page') ||
        el.firstElementChild?.shadowRoot?.querySelector('tap-page')) as TapPageElement | null;
      const measured = Math.min(this.maxHeight || 9e9, tapPage?.contentHeight || el.scrollHeight || el.offsetHeight);
      if (measured > 0) {
        this.#pageHeights.set(page, measured);
        return measured;
      }
    }
    return 0;
  };

  #applyHeight = (height: number) => {
    this.style.height = `${height}px`;
  };

  #syncHeight = (offset: number) => {
    if (!this.autoHeight) return;
    const { pages } = this.#store;
    const top = pages.at(-1);
    const belowTop = pages.at(-2);
    if (!top) return;

    const hTop = this.#getPageHeight(top, this.#topPageRef.value);
    if (!belowTop) {
      if (hTop > 0) this.#applyHeight(hTop);
      return;
    }

    const hBelow = this.#getPageHeight(belowTop, this.#belowPageRef.value);
    const width = this.clientWidth || innerWidth;
    const progress = clamp(0, offset / (width || 1), 1);
    this.#applyHeight(Math.round(hTop + (hBelow - hTop) * progress));
  };

  #animateOffset = (from: number, to: number, { duration = STACK_DURATION } = {}) => {
    this.#store({ offset: from });
    this.#syncHeight(from);
    const start = performance.now();
    return new Promise<void>((resolve) => {
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const offset = from + (to - from) * easeOutCubic(t);
        this.#store({ offset });
        this.#syncHeight(offset);
        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
  };

  #enter = async (page: StackPushOptions) => {
    await new Promise((res) => requestAnimationFrame(res));
    if (this.#busy || this.#store.pages.at(-1) !== page) return;
    const el = this.#topPageRef.value;
    if (!el) return;
    this.#busy = true;
    const from = this.#store.offset || el.offsetWidth;
    await this.#animateOffset(from, 0);
    this.#busy = false;
  };

  #push = (page: StackPushOptions) => {
    if (this.#store.pages.includes(page)) return;
    const animated = page.animated !== false;
    this.#store({
      pages: [...this.#store.pages, page],
      ...(animated ? { offset: this.clientWidth || innerWidth } : null),
    });
    if (animated) queueMicrotask(() => this.#enter(page));
    else requestAnimationFrame(() => this.#syncHeight(0));
  };

  #restore = (page: StackPushOptions) => this.#push(page);

  #replace = (page: StackPushOptions) => {
    if (this.#store.pages.at(-1) === page) return;
    this.#busy = false;
    const animated = page.animated ?? false;
    this.#store({
      pages: [...this.#store.pages.slice(0, -1), page],
      ...(animated ? { offset: this.clientWidth || innerWidth } : { offset: 0 }),
    });
    if (animated) queueMicrotask(() => this.#enter(page));
    else requestAnimationFrame(() => this.#syncHeight(0));
  };

  #pop = async (page?: StackPushOptions) => {
    const top = this.#store.pages.at(-1);
    if (!top || this.#busy) return;
    if (page && top !== page) return;
    this.#busy = true;
    if (top.animated !== false) {
      const el = this.#topPageRef.value;
      if (el) await this.#animateOffset(0, el.offsetWidth);
    }
    this.#store({ pages: this.#store.pages.slice(0, -1), offset: 0 });
    if (top.animated === false) this.#syncHeight(0);
    this.#busy = false;
  };

  #onPagePan = (page: StackPushOptions, evt: CustomEvent<PanEventDetail>) => {
    if (page !== this.#store.pages.at(-1) || page.gesture === false || this.#busy) return;
    const offset = Math.max(0, this.#store.offset + evt.detail.x);
    if (offset === 0) return;
    this.#store({ offset });
    this.#syncHeight(offset);
  };

  #onPageSwipe = (page: StackPushOptions, evt: CustomEvent<SwipeEventDetail>) => {
    if (page !== this.#store.pages.at(-1) || page.gesture === false || this.#busy) return;
    if (evt.detail.direction === 'right' && evt.detail.speed > 0.5) {
      this.#closeSpeed = evt.detail.speed;
    }
  };

  #onPagePanEnd = async (page: StackPushOptions, el: HTMLElement) => {
    const offset = this.#store.offset;
    const speed = this.#closeSpeed;
    this.#closeSpeed = 0;
    if (page !== this.#store.pages.at(-1) || page.gesture === false || this.#busy) return;

    if (page.canLeave && !page.canLeave()) {
      await this.#animateOffset(offset, 0, { duration: this.#duration(offset, el.offsetWidth) });
      return;
    }

    const width = el.offsetWidth;
    if (offset > width * 0.33 || speed) {
      this.#busy = true;
      await this.#animateOffset(offset, width, {
        duration: this.#duration(width - offset, width, speed),
      });
      this.#store({ pages: this.#store.pages.slice(0, -1), offset: 0 });
      this.#busy = false;
      if (!this.disableHistory && page.history !== false && history.store.$hasCloseHandle) history.back();
      return;
    }
    await this.#animateOffset(offset, 0, { duration: this.#duration(offset, width) });
  };

  @willMount()
  #initUpdateStore = () => {
    const children = [...this.children];
    if (!children.length) return;
    this.push({
      content: html`${children}`,
      history: false,
      animated: false,
      gesture: false,
    });
  };

  @mounted()
  #init = () => {
    this.#syncHeight(0);
    return connect(this.#store, this.update);
  };

  @effect((i) => [i.autoHeight, i.maxHeight, i.#store.pages])
  #watchContentHeight = () => {
    if (!this.autoHeight) return;
    let frame = 0;
    const wrappers = [this.#topPageRef.value, this.#store.pages.length > 1 ? this.#belowPageRef.value : null];
    const observer = new MutationObserver((records) => {
      // Ignore the wrapper styles written by measurement and navigation.
      if (records.some(({ type, target }) => type !== 'attributes' || !wrappers.includes(target as HTMLElement))) {
        frame ||= requestAnimationFrame(() => {
          frame = 0;
          this.#pageHeights = new WeakMap();
          this.#syncHeight(this.#store.offset);
        });
      }
    });
    for (const el of wrappers) {
      if (!el) continue;
      const options = { subtree: true, childList: true, characterData: true, attributes: true };
      observer.observe(el, options);
      if (el.firstElementChild?.shadowRoot) observer.observe(el.firstElementChild.shadowRoot, options);
    }
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  };

  @template()
  #content = () => {
    const { pages, offset } = this.#store;
    const top = pages.at(-1);
    // Parallax/dim only apply to the page directly under the top one; deeper pages
    // are fully hidden behind it, so they keep transform-less like before
    const belowTop = pages.at(-2);
    const width = this.clientWidth || innerWidth;
    const progress = Math.min(1, offset / (width || 1));
    // Per-frame values stay on the two wrappers' inline styles; the page subtree
    // (page.content) never invalidates because it's the same object reference
    return html`
      ${pages.map((page) => {
        const isTop = page === top;
        const isBelowTop = page === belowTop;
        return html`
          <div
            ${isTop ? this.#topPageRef : isBelowTop ? this.#belowPageRef : undefined}
            class=${classMap({ page: true, top: !!isTop })}
            ?inert=${!isTop}
            style=${styleMap({
              transform: isTop
                ? offset > 0
                  ? `translateX(${offset}px)`
                  : undefined
                : isBelowTop
                  ? `translateX(${-STACK_PARALLAX * width * (1 - progress)}px)`
                  : undefined,
            })}
            @pan=${(evt: CustomEvent<PanEventDetail>) => this.#onPagePan(page, evt)}
            @swipe=${(evt: CustomEvent<SwipeEventDetail>) => this.#onPageSwipe(page, evt)}
            @end=${(evt: Event) => this.#onPagePanEnd(page, evt.currentTarget as HTMLElement)}
          >
            ${page.content}
            <div
              v-if=${isBelowTop}
              class="mask"
              style=${styleMap({ opacity: 0.08 * (1 - progress) })}
            ></div>
          </div>
        `;
      })}
    `;
  };

  get store() {
    return this.#store;
  }

  push(options: StackPushOptions) {
    if (!this.disableHistory && options.history !== false) {
      history.push({
        close: () => this.#pop(options),
        shouldClose: options.canLeave,
        open: () => this.#restore(options),
      });
    }
    this.#push(options);
  }

  replace(options: StackPushOptions) {
    if (!this.#store.pages.length) {
      this.push(options);
      return;
    }
    if (!this.disableHistory && options.history !== false) {
      history.replace({
        close: () => this.#pop(options),
        shouldClose: options.canLeave,
        open: () => this.#restore(options),
      });
    }
    this.#replace(options);
  }

  pop() {
    const top = this.#store.pages.at(-1);
    this.#pop();
    if (!this.disableHistory && top?.history !== false && history.store.$hasCloseHandle) {
      history.back();
    }
  }
}

export const Stack = TapStackElement;
