import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  aria,
  attribute,
  customElement,
  effect,
  emitter,
  mounted,
  part,
  property,
  shadow,
  template,
} from '@mantou/gem/lib/decorators';
import { createRef, createState, css, GemElement, html } from '@mantou/gem/lib/element';
import { addListener } from '@mantou/gem/lib/utils';

import { icons } from '../lib/icons';
import { DyPromise } from '../lib/utils';
import type { ActionSheetAction, ActionSheetGroup } from './action-sheet';
import { ActionSheet } from './action-sheet';
import { Stack } from './stack';

import './action-sheet';
import './navbar';
import './page';
import './use';

export type BrowserItem<T = unknown> = ActionSheetAction<T>;

export interface BrowserOptions<T = unknown> {
  src: string;
  title?: string;
  items?: BrowserItem<T>[];
  actions?: BrowserItem<T>[];
  groups?: ActionSheetGroup<T>[];
  animated?: boolean;
  /**
   * Target stack or context element used to find the closest `<tap-stack>`.
   * When omitted, defaults to the global root `Stack`.
   */
  stack?: Element;
}

const style = css`
  :host(:where(:not([hidden]))) {
    position: absolute;
    inset: 0;
    display: block;
  }
  .frame {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: 0;
    box-sizing: border-box;
  }
`;

@customElement('tap-browser')
@shadow()
@adoptedStyle(style)
@aria({ role: 'region' })
export class TapBrowserElement<T = unknown> extends GemElement {
  @part static navbar: string;
  @part static frame: string;
  @part static more: string;

  @attribute src: string;
  @attribute title: string;
  @property items?: BrowserItem<T>[];
  @property actions?: BrowserItem<T>[];
  @property groups?: ActionSheetGroup<T>[];

  @emitter close: Emitter<null>;
  @emitter select: Emitter<BrowserItem<T>>;

  static open<T = unknown>(options: BrowserOptions<T>) {
    const browser = new this<T>();
    browser.src = options.src;
    browser.title = options.title || '';
    browser.items = options.items || options.actions;
    browser.groups = options.groups;
    const result = DyPromise.new<void, { browser: TapBrowserElement<T> }>(
      (resolve) => {
        browser.#onClosed = resolve;
      },
      { browser },
    );
    (Stack.getClosestStack(options.stack) || Stack).push({
      content: browser,
      animated: options.animated,
    });
    return result;
  }

  #state = createState({ loading: false, ready: false });
  #onClosed?: () => void;
  #frameRef = createRef<HTMLIFrameElement>();

  get #items() {
    return this.items || this.actions;
  }

  #onBack = () => {
    this.close(null);
  };

  #openSheet = async () => {
    const items = this.#items;
    if (!items?.length && !this.groups?.length) return;
    const action = await ActionSheet.open<T>({
      actions: items,
      groups: this.groups,
    });
    if (action) {
      this.select(action);
    }
  };

  @effect((i) => [i.src, i.#state.ready])
  #syncSrc = () => {
    if (!this.src) return;
    if (!this.#state.ready) {
      const origin = new URL(this.src, location.href).origin;
      const preconnect = document.createElement('link');
      preconnect.rel = 'preconnect';
      preconnect.href = origin;
      const prefetch = document.createElement('link');
      prefetch.rel = 'prefetch';
      prefetch.as = 'document';
      prefetch.href = this.src;
      document.head.append(preconnect, prefetch);
      return () => {
        preconnect.remove();
        prefetch.remove();
      };
    }
    // Avoid entering the homepage history stack
    this.#frameRef.value!.contentWindow!.location.replace(this.src);
    this.#state({ loading: true });
    return addListener(this.#frameRef.value!, 'load', () => {
      this.#state({ loading: false });
    });
  };

  @mounted()
  #init = () => {
    // iframe 同主线程，延时防止动画卡顿
    const timer = setTimeout(() => this.#state({ ready: true }), 350);
    return () => {
      clearTimeout(timer);
      this.#onClosed?.();
    };
  };

  @template()
  #render = () => html`
    <tap-page loading=${this.#state.loading}>
      <tap-navbar
        slot="header"
        part=${TapBrowserElement.navbar}
        title=${this.title}
        back
        default-back
        @backclick=${this.#onBack}
      >
        <tap-use
          v-if=${!!(this.#items?.length || this.groups?.length)}
          slot="right"
          part=${TapBrowserElement.more}
          role="button"
          aria-label="More"
          @click=${this.#openSheet}
          .element=${icons.more}
        ></tap-use>
      </tap-navbar>
      <iframe ${this.#frameRef} class="frame" part=${TapBrowserElement.frame} allowfullscreen></iframe>
    </tap-page>
  `;

  get contentWindow() {
    return this.#frameRef.value!.contentWindow;
  }
}

export const Browser = TapBrowserElement;
