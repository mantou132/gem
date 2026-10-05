import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  aria,
  attribute,
  boolattribute,
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
  /**Hide the navbar; close via the edge swipe-back gesture or `close` */
  headerless?: boolean;
  /**Navbar overlays the frame with a transparent background */
  floatheader?: boolean;
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
  @part static action: string;

  @attribute src: string;
  @attribute title: string;
  /**Hide the navbar; close via the edge swipe-back gesture or `close` */
  @boolattribute headerless: boolean;
  /**
   * Navbar overlays the frame and stays transparent, since the frame's own scroll can't be observed.
   * The page in the frame needs to handle the top inset itself.
   */
  @boolattribute floatheader: boolean;
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
    browser.headerless = !!options.headerless;
    browser.floatheader = !!options.floatheader;
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

  /** A single icon action is shown directly in the navbar instead of the sheet */
  get #directAction() {
    const items = this.#items;
    if (this.groups?.length || items?.length !== 1 || !items[0].icon) return;
    return items[0];
  }

  #selectAction = async (action: BrowserItem<T>) => {
    if (action.disabled) return;
    await action.handler?.(action);
    this.select(action);
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

  #load = () => {
    // Avoid entering the homepage history stack; also works for cross-origin frames, unlike `reload()`
    this.#frameRef.value!.contentWindow!.location.replace(this.src);
    this.#state({ loading: true });
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
    this.#load();
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
  #render = () => {
    const directAction = this.#directAction;
    return html`
    <tap-page loading=${this.#state.loading} ?floatheader=${this.floatheader}>
      <tap-navbar
        v-if=${!this.headerless}
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
          part=${directAction ? TapBrowserElement.action : TapBrowserElement.more}
          role="button"
          aria-label=${directAction ? (typeof directAction.label === 'string' ? directAction.label : '') : 'More'}
          aria-disabled=${!!directAction?.disabled}
          @click=${directAction ? () => this.#selectAction(directAction) : this.#openSheet}
          .element=${directAction?.icon || icons.more}
        ></tap-use>
      </tap-navbar>
      <iframe ${this.#frameRef} class="frame" part=${TapBrowserElement.frame} allowfullscreen></iframe>
    </tap-page>
  `;
  };

  /** Reload `src` */
  reload() {
    this.#load();
  }

  get contentWindow() {
    return this.#frameRef.value!.contentWindow;
  }
}

export const Browser = TapBrowserElement;
