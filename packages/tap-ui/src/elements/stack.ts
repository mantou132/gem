import { createDecoratorTheme } from '@mantou/gem/helper/theme';
import { adoptedStyle, connectStore, customElement, template } from '@mantou/gem/lib/decorators';
import type { TemplateResult } from '@mantou/gem/lib/element';
import { createRef, css, GemElement, html } from '@mantou/gem/lib/element';
import { history } from '@mantou/gem/lib/history';
import { createStore } from '@mantou/gem/lib/store';
import { classMap, styleMap } from '@mantou/gem/lib/utils';

import { easeOutCubic } from '../lib/easing';
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

const elementTheme = createDecoratorTheme({ brightness: 0.92, shift: '0px' });

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
  .page {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    background: ${theme.backgroundColor};
    will-change: transform;
  }
  .page:not(.covered) {
    box-shadow: -2px 0 16px rgb(0 0 0 / 0.08);
  }
  .page.covered:not(:has(~ .page.covered)) {
    filter: brightness(${elementTheme.brightness});
    transform: translateX(${elementTheme.shift});
  }
`;

@customElement('tap-stack')
@adoptedStyle(style)
@connectStore(stackStore)
export class TapStackElement extends GemElement {
  static instance?: TapStackElement;

  #pageRef = createRef<HTMLElement>();
  #busy = false;
  #swipeClose = false;
  #swipeSpeed = 0;

  @elementTheme(() => [stackStore.offset])
  #theme = () => {
    const width = this.clientWidth;
    const getStackProgress = () => Math.min(1, stackStore.offset / (width || 1));
    return {
      brightness: 0.92 + 0.08 * getStackProgress(),
      shift: `${-STACK_PARALLAX * width * (1 - getStackProgress())}px`,
    };
  };

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

  #duration = (distance: number, width: number, speed = 0) => {
    if (speed > 0) {
      return Math.min(STACK_DURATION, Math.max(STACK_DURATION_MIN, distance / speed));
    }
    return Math.min(STACK_DURATION, Math.max(STACK_DURATION_MIN, STACK_DURATION * (distance / (width || 1))));
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
      this.#swipeClose = true;
      this.#swipeSpeed = evt.detail.speed;
    }
  };

  #onPagePanEnd = async (page: StackPushOptions, el: HTMLElement) => {
    const offset = stackStore.offset;
    const swipeClose = this.#swipeClose;
    const swipeSpeed = this.#swipeSpeed;
    this.#swipeClose = false;
    this.#swipeSpeed = 0;
    if (!offset || page !== stackStore.pages.at(-1)) return;

    if (page.canLeave && !page.canLeave()) {
      await this.#animateOffset(offset, 0, { duration: this.#duration(offset, el.offsetWidth) });
      return;
    }

    const width = el.offsetWidth;
    if (offset > width * 0.33 || swipeClose) {
      this.#busy = true;
      await this.#animateOffset(offset, width, {
        duration: this.#duration(width - offset, width, swipeClose ? swipeSpeed : 0),
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
    return html`
      ${pages.map((page) => {
        const isTop = page === top;
        return html`
          <div
            ${this.#pageRef}
            class=${classMap({ page: true, covered: !isTop })}
            ?inert=${!isTop}
            style=${isTop && offset > 0 ? styleMap({ transform: `translateX(${offset}px)` }) : undefined}
            @pan=${(evt: CustomEvent<PanEventDetail>) => this.#onPagePan(page, evt)}
            @swipe=${(evt: CustomEvent<SwipeEventDetail>) => this.#onPageSwipe(page, evt)}
            @end=${(evt: Event) => this.#onPagePanEnd(page, evt.currentTarget as HTMLElement)}
          >
            ${page.content}
          </div>
        `;
      })}
    `;
  };
}

export const Stack = TapStackElement;
