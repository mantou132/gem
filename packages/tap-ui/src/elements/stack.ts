import { adoptedStyle, connectStore, customElement, template } from '@mantou/gem/lib/decorators';
import type { TemplateResult } from '@mantou/gem/lib/element';
import { createRef, css, GemElement, html } from '@mantou/gem/lib/element';
import { history } from '@mantou/gem/lib/history';
import { createStore } from '@mantou/gem/lib/store';
import { classMap, styleMap } from '@mantou/gem/lib/utils';

import { easeOutCubic } from '../lib/easing';
import { closestElement } from '../lib/element';
import { clamp } from '../lib/number';
import { theme } from '../lib/theme';
import type { PanEventDetail, SwipeEventDetail } from './gesture';

export type StackPushOptions = {
  content: string | number | TemplateResult | Element | Element[];
  /**Play enter animation; default `true` */
  animated?: boolean;
  /**Enable swipe-to-close; default `true` */
  gesture?: boolean;
  canLeave?: () => boolean;
};

/** Match iOS / WeChat navigation timing */
const STACK_DURATION = 350;
const STACK_DURATION_MIN = 140;
/** Covered page rests at -30% width (iOS parallax) */
const STACK_PARALLAX = 0.3;

export const stackStore = createStore({
  pages: [] as StackPushOptions[],
  offset: 0,
});

const style = css`
  :scope {
    position: fixed;
    inset: 0;
    z-index: 1;
    overflow: hidden;
  }
  :scope[inert] {
    pointer-events: none;
  }
`;

export const stackStyle = css({
  page: `
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    background: ${theme.backgroundColor};
    will-change: transform;
  `,
  covered: `
    .page:not(&) {
      box-shadow: -2px 0 16px rgb(0 0 0 / 0.08);
    }
  `,
  /** Dim layer over the covered page; composited opacity instead of per-frame inherited custom props */
  mask: `
    position: absolute;
    inset: 0;
    background: black;
    opacity: 0;
    pointer-events: none;
    z-index: calc(${theme.popupZIndex} + 3);
    will-change: opacity;
  `,
});

@customElement('tap-stack')
@adoptedStyle(style)
@adoptedStyle(stackStyle)
@connectStore(stackStore)
export class TapStackElement extends GemElement {
  static instance?: TapStackElement;

  static push(options: StackPushOptions) {
    const stack = (TapStackElement.instance ??= new TapStackElement());
    stack.#push(options);
    if (!stack.isConnected) document.body.append(stack);
  }

  static close() {
    if (!TapStackElement.instance) return;
    TapStackElement.instance.#pop();
    if (history.store.$hasCloseHandle) {
      history.back();
    }
  }

  static inCurrentStack(ele: HTMLElement) {
    return !closestElement(ele, `.${stackStyle.page}.${stackStyle.covered}`);
  }

  #pageRef = createRef<HTMLElement>();
  #busy = false;
  #closeSpeed = 0;

  #duration = (distance: number, width: number, speed = 0) => {
    if (speed > 0) {
      return clamp(STACK_DURATION_MIN, distance / speed, STACK_DURATION);
    }
    return clamp(STACK_DURATION_MIN, STACK_DURATION * (distance / (width || 1)), STACK_DURATION);
  };

  #animateOffset = (from: number, to: number, { duration = STACK_DURATION } = {}) => {
    stackStore({ offset: from });
    const start = performance.now();
    return new Promise<void>((resolve) => {
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        stackStore({ offset: from + (to - from) * easeOutCubic(t) });
        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
  };

  #push = (options: StackPushOptions) => {
    if (options.gesture !== false) {
      history.push({
        close: () => this.#pop(options),
        shouldClose: options.canLeave,
        open: () => this.#restore(options),
      });
    }
    const animated = options.animated !== false;
    stackStore({
      pages: [...stackStore.pages, options],
      ...(animated ? { offset: this.clientWidth || innerWidth } : null),
    });
    if (animated) queueMicrotask(() => this.#enter(options));
  };

  #enter = async (page: StackPushOptions) => {
    // Only animate if this page is still on top (e.g. not superseded by a faster push)
    if (this.#busy || stackStore.pages.at(-1) !== page) return;
    const el = this.#pageRef.value;
    if (!el) return;
    this.#busy = true;
    const from = stackStore.offset || el.offsetWidth;
    await this.#animateOffset(from, 0);
    this.#busy = false;
  };

  #restore = (page: StackPushOptions) => {
    if (stackStore.pages.includes(page)) return;
    const animated = page.animated !== false;
    stackStore({
      pages: [...stackStore.pages, page],
      ...(animated ? { offset: this.clientWidth || innerWidth } : null),
    });
    if (animated) queueMicrotask(() => this.#enter(page));
  };

  #pop = async (page?: StackPushOptions) => {
    const top = stackStore.pages.at(-1);
    if (!top || this.#busy) return;
    if (page && top !== page) return;
    this.#busy = true;
    if (top.animated !== false) {
      const el = this.#pageRef.value;
      if (el) await this.#animateOffset(0, el.offsetWidth);
    }
    stackStore({ pages: stackStore.pages.slice(0, -1), offset: 0 });
    this.#busy = false;
  };

  #onPagePan = (page: StackPushOptions, evt: CustomEvent<PanEventDetail>) => {
    if (page !== stackStore.pages.at(-1) || page.gesture === false || this.#busy) return;
    const offset = Math.max(0, stackStore.offset + evt.detail.x);
    if (offset === 0) return;
    stackStore({ offset });
  };

  #onPageSwipe = (page: StackPushOptions, evt: CustomEvent<SwipeEventDetail>) => {
    if (page !== stackStore.pages.at(-1)) return;
    if (evt.detail.direction === 'right' && evt.detail.speed > 0.5) {
      this.#closeSpeed = evt.detail.speed;
    }
  };

  #onPagePanEnd = async (page: StackPushOptions, el: HTMLElement) => {
    const offset = stackStore.offset;
    const speed = this.#closeSpeed;
    this.#closeSpeed = 0;
    if (page !== stackStore.pages.at(-1)) return;

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
      stackStore({ pages: stackStore.pages.slice(0, -1), offset: 0 });
      this.#busy = false;
      if (history.store.$hasCloseHandle) history.back();
      return;
    }
    await this.#animateOffset(offset, 0, { duration: this.#duration(offset, width) });
  };

  @template()
  #content = () => {
    const { pages, offset } = stackStore;
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
            ${this.#pageRef}
            class=${classMap({ page: true, [stackStyle.page]: true, [stackStyle.covered]: !isTop })}
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
              class=${stackStyle.mask}
              style=${styleMap({ opacity: 0.08 * (1 - progress) })}
            ></div>
          </div>
        `;
      })}
    `;
  };
}

export const Stack = TapStackElement;
