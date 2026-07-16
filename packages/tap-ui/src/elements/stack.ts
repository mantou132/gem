import { adoptedStyle, connectStore, customElement, effect, template } from '@mantou/gem/lib/decorators';
import type { TemplateResult } from '@mantou/gem/lib/element';
import { createRef, css, GemElement, html } from '@mantou/gem/lib/element';
import { history } from '@mantou/gem/lib/history';
import { createStore } from '@mantou/gem/lib/store';
import { classMap, styleMap } from '@mantou/gem/lib/utils';

import { commonAnimationOptions } from '../lib/animations';
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

export const stackStore = createStore({
  pages: [] as StackPushOptions[],
  offset: 0,
});

const style = css`
  :scope {
    position: fixed;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    overflow: hidden;
  }
  :scope:not([inert]) {
    pointer-events: auto;
  }
  .page {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    background: ${theme.backgroundColor};
    will-change: transform;
    transition: filter 150ms ${theme.timingFunction};
  }
  .page.covered {
    filter: brightness(0.92);
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

  static push(options: StackPushOptions) {
    const stack = (TapStackElement.instance ??= new TapStackElement());
    stack.#push(options);
    document.body.append(stack);
  }

  static close() {
    if (!TapStackElement.instance) return;
    TapStackElement.instance.#pop();
    if (history.store.$hasCloseHandle) {
      history.back();
    }
  }

  #animateX = async (el: HTMLElement, from: string, to: string, options?: KeyframeAnimationOptions) => {
    await el.animate([{ transform: from }, { transform: to }], {
      ...commonAnimationOptions,
      ...options,
    }).finished;
    el.style.transform = '';
  };

  #push = (options: StackPushOptions) => {
    history.push({
      close: () => this.#pop(options),
      shouldClose: options.canLeave,
      open: () => this.#restore(options),
    });
    stackStore({ pages: [...stackStore.pages, options] });
    if (options.animated !== false) queueMicrotask(() => this.#enter(options));
  };

  #enter = async (page: StackPushOptions) => {
    // Only animate if this page is still on top (e.g. not superseded by a faster push)
    if (this.#busy || stackStore.pages.at(-1) !== page) return;
    const el = this.#pageRef.value;
    if (!el) return;
    this.#busy = true;
    await this.#animateX(el, 'translateX(100%)', 'translateX(0)', { fill: 'backwards' });
    this.#busy = false;
  };

  #restore = (page: StackPushOptions) => {
    if (stackStore.pages.includes(page)) return;
    stackStore({ pages: [...stackStore.pages, page] });
    if (page.animated !== false) queueMicrotask(() => this.#enter(page));
  };

  #pop = async (page?: StackPushOptions) => {
    const top = stackStore.pages.at(-1);
    if (!top || this.#busy) return;
    if (page && top !== page) return;
    this.#busy = true;
    if (top.animated !== false) {
      const el = this.#pageRef.value;
      if (el) await this.#animateX(el, 'translateX(0)', 'translateX(100%)');
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
    }
  };

  #onPagePanEnd = async (page: StackPushOptions, el: HTMLElement) => {
    const offset = stackStore.offset;
    const swipeClose = this.#swipeClose;
    this.#swipeClose = false;
    if (!offset || page !== stackStore.pages.at(-1)) return;

    el.style.transform = `translateX(${offset}px)`;
    stackStore({ offset: 0 });

    if (page.canLeave && !page.canLeave()) {
      await this.#animateX(el, `translateX(${offset}px)`, 'translateX(0)');
      return;
    }

    const width = el.offsetWidth;
    if (offset > width * 0.33 || swipeClose) {
      this.#busy = true;
      await this.#animateX(el, `translateX(${offset}px)`, `translateX(${width}px)`, {
        duration: Math.max(80, commonAnimationOptions.duration * ((width - offset) / width)),
      });
      stackStore({ pages: stackStore.pages.slice(0, -1), offset: 0 });
      this.#busy = false;
      if (history.store.$hasCloseHandle) history.back();
      return;
    }
    await this.#animateX(el, `translateX(${offset}px)`, 'translateX(0)');
  };

  @effect(() => [stackStore.pages.length])
  #syncInert = () => {
    this.inert = stackStore.pages.length === 0;
  };

  @template()
  #content = () => {
    const { pages, offset } = stackStore;
    const top = pages.at(-1);
    return html`
      ${pages.map((page) => {
        const isTop = page === top;
        const dragging = isTop && offset > 0;
        return html`
          <div
            ${this.#pageRef}
            class=${classMap({ page: true, covered: !isTop })}
            ?inert=${!isTop}
            style=${dragging ? styleMap({ transform: `translateX(${offset}px)` }) : undefined}
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
