import { adoptedStyle, boolattribute, customElement, mounted, template, willMount } from '@mantou/gem/lib/decorators';
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

  static instance?: TapStackElement;

  static push(options: StackPushOptions) {
    const stack = (TapStackElement.instance ??= new TapStackElement());
    stack.push(options);
    if (!stack.isConnected) document.body.append(stack);
  }

  static pop() {
    if (!TapStackElement.instance) return;
    TapStackElement.instance.pop();
  }

  /**@deprecated Please use `pop()` */
  static close() {
    return this.pop();
  }

  static inCurrentStack(ele: HTMLElement) {
    const stack = closestElement(ele, TapStackElement);
    if (!stack) return false;
    const topPage = stack.#topPageRef.value;
    return !!topPage && containsElement(topPage, ele);
  }

  static getClosestStack(ele: HTMLElement) {
    return closestElement<TapStackElement>(ele, 'tap-stack');
  }

  #topPageRef = createRef<HTMLElement>();
  #store = createStore({ pages: [] as StackPushOptions[], offset: 0 });
  #busy = false;
  #closeSpeed = 0;

  #duration = (distance: number, width: number, speed = 0) => {
    if (speed > 0) {
      return clamp(STACK_DURATION_MIN, distance / speed, STACK_DURATION);
    }
    return clamp(STACK_DURATION_MIN, STACK_DURATION * (distance / (width || 1)), STACK_DURATION);
  };

  #animateOffset = (from: number, to: number, { duration = STACK_DURATION } = {}) => {
    this.#store({ offset: from });
    const start = performance.now();
    return new Promise<void>((resolve) => {
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        this.#store({ offset: from + (to - from) * easeOutCubic(t) });
        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
  };

  #enter = async (page: StackPushOptions) => {
    // Only animate if this page is still on top (e.g. not superseded by a faster push)
    if (this.#busy || this.#store.pages.at(-1) !== page) return;
    const el = this.#topPageRef.value;
    if (!el) return;
    this.#busy = true;
    const from = this.#store.offset || el.offsetWidth;
    await this.#animateOffset(from, 0);
    this.#busy = false;
  };

  #restore = (page: StackPushOptions) => {
    if (this.#store.pages.includes(page)) return;
    const animated = page.animated !== false;
    this.#store({
      pages: [...this.#store.pages, page],
      ...(animated ? { offset: this.clientWidth || innerWidth } : null),
    });
    if (animated) queueMicrotask(() => this.#enter(page));
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
    this.#busy = false;
  };

  #onPagePan = (page: StackPushOptions, evt: CustomEvent<PanEventDetail>) => {
    if (page !== this.#store.pages.at(-1) || page.gesture === false || this.#busy) return;
    const offset = Math.max(0, this.#store.offset + evt.detail.x);
    if (offset === 0) return;
    this.#store({ offset });
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
  #init = () => connect(this.#store, this.update);

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
            ${this.#topPageRef}
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

  push(options: StackPushOptions) {
    if (!this.disableHistory && options.history !== false) {
      history.push({
        close: () => this.#pop(options),
        shouldClose: options.canLeave,
        open: () => this.#restore(options),
      });
    }
    const animated = options.animated !== false;
    this.#store({
      pages: [...this.#store.pages, options],
      ...(animated ? { offset: this.clientWidth || innerWidth } : null),
    });
    if (animated) queueMicrotask(() => this.#enter(options));
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
