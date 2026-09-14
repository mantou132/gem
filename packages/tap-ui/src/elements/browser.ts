import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  aria,
  attribute,
  customElement,
  effect,
  emitter,
  part,
  property,
  shadow,
  template,
  unmounted,
} from '@mantou/gem/lib/decorators';
import { createRef, createState, css, GemElement, html } from '@mantou/gem/lib/element';
import { addListener } from '@mantou/gem/lib/utils';

import { icons } from '../lib/icons';
import { theme } from '../lib/theme';
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
  .more {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5em;
    height: 2.5em;
    margin: 0;
    padding: 0;
    border: none;
    border-radius: ${theme.normalRound};
    background: transparent;
    color: ${theme.highlightColor};
    font: inherit;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .icon {
    width: 1.25em;
    height: 1.25em;
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

  #state = createState({ loading: false });
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

  @effect((i) => [i.src])
  #syncSrc = () => {
    // Avoid entering the homepage history stack
    this.#frameRef.value!.contentWindow!.location.replace(this.src);
    this.#state({ loading: true });
    return addListener(this.#frameRef.value!, 'load', () => {
      this.#state({ loading: false });
    });
  };

  @unmounted()
  #dispose = () => {
    this.#onClosed?.();
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
        <button
          v-if=${!!(this.#items?.length || this.groups?.length)}
          slot="right"
          class="more"
          part=${TapBrowserElement.more}
          type="button"
          aria-label="More"
          @click=${this.#openSheet}
        >
          <tap-use class="icon" .element=${icons.more}></tap-use>
        </button>
      </tap-navbar>
      <iframe ${this.#frameRef} class="frame" part=${TapBrowserElement.frame} allowfullscreen></iframe>
    </tap-page>
  `;

  get contentWindow() {
    return this.#frameRef.value!.contentWindow;
  }
}

export const Browser = TapBrowserElement;
