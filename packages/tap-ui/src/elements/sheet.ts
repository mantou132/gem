import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  attribute,
  boolattribute,
  customElement,
  effect,
  emitter,
  memo,
  part,
  shadow,
  slot,
  state,
} from '@mantou/gem/lib/decorators';
import { createRef, createState, css, GemElement, html, type TemplateResult } from '@mantou/gem/lib/element';
import { styleMap } from '@mantou/gem/lib/utils';

import { easeOutCubic } from '../lib/easing';
import { setBodyInert } from '../lib/element';
import { clamp } from '../lib/number';
import { theme } from '../lib/theme';
import { DyPromise } from '../lib/utils';
import type { PanEventDetail, SwipeEventDetail } from './gesture';

import './gesture';
import './pull-container';
import './scroll-box';

/** Match stack / iOS sheet timing */
const SHEET_DURATION = 350;
const SHEET_DURATION_MIN = 140;

const style = css`
  :host {
    view-transition-name: tap-sheet;
    position: fixed;
    z-index: ${theme.popupZIndex};
    top: env(titlebar-area-height, var(--titlebar-area-height, 0px));
    left: 0;
    width: 100%;
    height: calc(100% - env(titlebar-area-height, var(--titlebar-area-height, 0px)));
    display: none;
    align-items: flex-end;
    justify-content: center;
  }
  :host(:not([hidden]):where([open], :state(closing))) {
    display: flex;
  }
  :host(:state(closing)),
  :host(:not([gesture])) .header-area {
    pointer-events: none;
  }
  .mask {
    position: absolute;
    inset: 0;
    background-color: rgba(0, 0, 0, calc(${theme.maskAlpha} + 0.2));
  }
  .sheet {
    position: relative;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-height: 90%;
    min-height: 8em;
    background-color: ${theme.backgroundColor};
    color: ${theme.textColor};
    border-radius: calc(${theme.normalRound} * 3) calc(${theme.normalRound} * 3) 0 0;
    box-shadow: 0 -4px 24px rgba(0, 0, 0, calc(${theme.maskAlpha} - 0.05));
    will-change: transform;
    outline: none;
    padding: 0 1.2em 1.2em;
  }
  .header-area {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
  }
  .header-area::before {
    content: '';
    align-self: center;
    width: 2.5em;
    margin: 0.65em 0 0.35em;
    border-radius: 1em;
  }
  :host([gesture]) .header-area::before {
    background: ${theme.disabledColor};
    height: 0.3em;
  }
  .header {
    font-size: 1.0625em;
    font-weight: bold;
    color: ${theme.highlightColor};
    text-align: center;
    user-select: none;
    padding: 0.35em 1em 0.75em;
    flex-shrink: 0;
  }
  .body {
    flex-grow: 1;
    flex-shrink: 1;
    min-height: 0;
  }
`;

export interface SheetOptions {
  header?: string | TemplateResult;
  body?: string | TemplateResult;
  maskClosable?: boolean;
  gesture?: boolean;
  open?: boolean;
}

@customElement('tap-sheet')
@adoptedStyle(style)
@shadow({ delegatesFocus: true })
export class TapSheetElement extends GemElement {
  @part static sheet: string;
  @part @slot static header: string;
  @part static body: string;
  @slot static unnamed: string;

  @boolattribute open: boolean;
  @boolattribute maskClosable: boolean;
  @boolattribute gesture = true;
  @attribute header: string;
  @attribute body: string;

  @emitter close: Emitter;
  @emitter maskclick: Emitter;

  @state closing: boolean;

  headerSlot?: string | TemplateResult;
  bodySlot?: string | TemplateResult;

  /** Opens a sheet; settles when dismissed (mask / gesture / CloseWatcher). */
  static open(options: SheetOptions = {}) {
    const sheet = new this({ ...options, open: true });
    const restoreInert = setBodyInert(sheet);
    document.body.append(sheet);
    return DyPromise.new<void, { sheet: TapSheetElement }>(
      (res) => {
        sheet.addEventListener('close', () => res());
      },
      { sheet },
    ).finally(async () => {
      restoreInert();
      sheet.closing = true;
      await sheet.#finishClose();
      sheet.remove();
    });
  }

  constructor(options: SheetOptions = {}) {
    super();
    const { open, maskClosable, gesture, header, body } = options;
    if (open) this.open = open;
    if (maskClosable) this.maskClosable = maskClosable;
    this.gesture = gesture !== false;
    this.headerSlot = header;
    this.bodySlot = body;
  }

  #sheetRef = createRef<HTMLElement>();
  #bodyRef = createRef<HTMLElement>();
  #state = createState({ offset: 0 });
  #closeSpeed = 0;

  get #header() {
    return this.header || this.headerSlot;
  }

  get #body() {
    return this.body || this.bodySlot;
  }

  get #height() {
    return this.#sheetRef.value?.offsetHeight || 0;
  }

  #close = () => {
    this.close(null);
  };

  #onMaskClick = () => {
    this.focus();
    this.maskclick(null);
    if (this.maskClosable) this.#close();
  };

  #duration = (distance: number, height: number, speed = 0) => {
    if (speed > 0) {
      return clamp(SHEET_DURATION_MIN, distance / speed, SHEET_DURATION);
    }
    return clamp(SHEET_DURATION_MIN, SHEET_DURATION * (distance / (height || 1)), SHEET_DURATION);
  };

  #animateOffset = (from: number, to: number, { duration = SHEET_DURATION } = {}) => {
    this.#state({ offset: from });
    const start = performance.now();
    return new Promise<void>((resolve) => {
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        this.#state({ offset: from + (to - from) * easeOutCubic(t) });
        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
  };

  #finishClose = async () => {
    const height = this.#height;
    const from = this.#state.offset;
    const speed = this.#closeSpeed;
    this.#closeSpeed = 0;
    await this.#animateOffset(from, height, {
      duration: this.#duration(height - from, height, speed),
    });
  };

  #onPan = (evt: CustomEvent<PanEventDetail>) => {
    const offset = Math.max(0, this.#state.offset + evt.detail.y);
    if (offset === 0 && evt.detail.y <= 0) return;
    this.#state({ offset });
  };

  #onSwipe = (evt: CustomEvent<SwipeEventDetail>) => {
    if (evt.detail.direction === 'bottom' && evt.detail.speed > 0.5) {
      this.#closeSpeed = evt.detail.speed;
    }
  };

  #onPanEnd = async () => {
    const offset = this.#state.offset;
    const height = this.#height;
    const speed = this.#closeSpeed;
    if (offset > height * 0.33 || speed) {
      this.#close();
      return;
    }
    this.#closeSpeed = 0;
    await this.#animateOffset(offset, 0, { duration: this.#duration(offset, height) });
  };

  #onBodyPull = (evt: CustomEvent<{ distance: number }>) => {
    this.#state({ offset: Math.max(0, evt.detail.distance) });
  };

  #onBodyPullEnd = () => {
    this.#onPanEnd();
  };

  @memo((i) => [i.open])
  #updateClosing = (_: [boolean], oldDeps?: [boolean]) => {
    if (oldDeps) this.closing = !this.open;
  };

  @effect((i) => [i.open])
  #closeWatcher = () => {
    if (!this.open || typeof CloseWatcher === 'undefined') return;
    const watcher = new CloseWatcher();
    watcher.addEventListener('close', this.#close);
    return () => watcher.destroy();
  };

  @effect((i) => [i.open])
  #animation = async () => {
    if (this.open) {
      !this.shadowRoot?.activeElement && this.focus();
      this.#animateOffset(this.#height, 0);
    } else if (this.closing) {
      await this.#finishClose();
      this.closing = false;
      this.#state({ offset: 0 });
    }
  };

  render = () => {
    if (!this.open && !this.closing) return html``;

    const { offset } = this.#state;

    return html`
      <div
        class="mask"
        style=${styleMap({ opacity: 1 - Math.min(1, offset / (this.#height || innerHeight)) })}
        @click=${this.#onMaskClick}
      ></div>
      <div
        ${this.#sheetRef}
        part=${TapSheetElement.sheet}
        role="dialog"
        tabindex="0"
        aria-modal="true"
        class="sheet"
        style=${styleMap({ transform: `translateY(${offset}px)` })}
      >
        <tap-gesture
          class="header-area"
          @pan=${this.#onPan}
          @swipe=${this.#onSwipe}
          @end=${this.#onPanEnd}
        >
          <div v-if=${!!this.#header} part=${TapSheetElement.header} class="header" role="heading" aria-level="1">
            <slot name=${TapSheetElement.header}>${this.#header}</slot>
          </div>
        </tap-gesture>
        <tap-pull-container
          ${this.#bodyRef}
          class="body"
          part=${TapSheetElement.body}
          ?gesture=${this.gesture && !this.closing}
          @pull=${this.#onBodyPull}
          @pullend=${this.#onBodyPullEnd}
        >
          <slot>${this.#body}</slot>
        </tap-pull-container>
      </div>
    `;
  };
}

export const Sheet = TapSheetElement;
