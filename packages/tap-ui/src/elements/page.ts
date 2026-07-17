import {
  adoptedStyle,
  boolattribute,
  connectStore,
  customElement,
  effect,
  part,
  shadow,
  slot,
  template,
} from '@mantou/gem/lib/decorators';
import { createRef, createState, css, GemElement, html } from '@mantou/gem/lib/element';
import { addListener } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';
import type { PanEventDetail, SwipeEventDetail } from './gesture';
import type { TapNavbarElement } from './navbar';
import { stackStore } from './stack';
import './gesture';

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
    transition: filter 150ms ${theme.timingFunction};
  }
  :host([inert]) {
    filter: brightness(0.92);
  }
  .header,
  .footer {
    position: relative;
    flex-shrink: 0;
    z-index: 2;
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
    overflow: auto;
    -webkit-overflow-scrolling: touch;
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
@connectStore(stackStore)
export class TapPageElement extends GemElement {
  @slot @part static header: string;
  @slot @part static footer: string;
  @part static main: string;

  /**Header overlays content; navbar stays transparent until content scrolls */
  @boolattribute floatheader: boolean;

  #state = createState({ scrolled: false });
  #mainRef = createRef<HTMLElement>();
  #headerSlotRef = createRef<HTMLSlotElement>();

  get #inStack() {
    return !!this.closest('tap-stack');
  }

  get #nestedInPage() {
    return !!this.parentElement?.closest('tap-page');
  }

  #forward = (type: string, evt: CustomEvent) => {
    this.dispatchEvent(new CustomEvent(type, { detail: evt.detail, bubbles: true, composed: true }));
  };

  #syncHeaderTransparent = () => {
    const transparent = this.floatheader && !this.#state.scrolled;
    this.#headerSlotRef.value?.assignedElements().forEach((el) => {
      (el as TapNavbarElement).transparent = transparent;
    });
  };

  @effect(() => [stackStore.pages.length])
  #syncInert = () => {
    this.inert = !this.#inStack && !this.#nestedInPage && stackStore.pages.length > 0;
  };

  @effect((i) => [i.floatheader, i.#state.scrolled])
  #watchHeader = () => {
    this.#syncHeaderTransparent();
    const slot = this.#headerSlotRef.value;
    if (!slot) return;
    return addListener(slot, 'slotchange', this.#syncHeaderTransparent);
  };

  @effect((i) => [i.floatheader])
  #watchScroll = () => {
    if (!this.floatheader) {
      this.#state({ scrolled: false });
      return;
    }
    const el = this.#mainRef.value;
    if (!el) return;
    const onScroll = () => {
      this.#state({ scrolled: el.scrollTop > 0 });
    };
    onScroll();
    return addListener(el, 'scroll', onScroll, { passive: true });
  };

  @template()
  #content = () => {
    return html`
      <div class="header" part=${TapPageElement.header}>
        <slot ${this.#headerSlotRef} name=${TapPageElement.header}></slot>
      </div>
      <div ${this.#mainRef} class="main" part=${TapPageElement.main}>
        <slot></slot>
      </div>
      <div class="footer" part=${TapPageElement.footer}>
        <slot name=${TapPageElement.footer}></slot>
      </div>
      <tap-gesture
        v-if=${this.#inStack}
        class="gesture"
        @pan=${(evt: CustomEvent<PanEventDetail>) => this.#forward('pan', evt)}
        @swipe=${(evt: CustomEvent<SwipeEventDetail>) => this.#forward('swipe', evt)}
        @end=${(evt: CustomEvent) => this.#forward('end', evt)}
      ></tap-gesture>
    `;
  };
}
