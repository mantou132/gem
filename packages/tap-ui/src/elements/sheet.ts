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
  property,
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
import type {
  PullEndEventDetail,
  PullEventDetail,
  PushEndEventDetail,
  PushEventDetail,
  TapPullContainerElement,
} from './pull-container';

import './pull-container';
import './scroll-box';
import './stack';

/** Match stack / iOS sheet timing */
const SHEET_DURATION = 350;
const SHEET_DURATION_MIN = 140;

const style = css`
  :host {
    view-transition-name: tap-sheet;
    position: fixed;
    z-index: ${theme.popupZIndex};
    top: var(--titlebar-area-height, env(titlebar-area-height, 0px));
    left: 0;
    width: 100%;
    height: calc(100% - var(--titlebar-area-height, env(titlebar-area-height, 0px)));
    display: none;
    align-items: flex-end;
    justify-content: center;
  }
  :host(:not([hidden]):where([open], :state(closing))) {
    display: flex;
  }
  :host(:state(closing)) {
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
    max-width: 640px;
    max-height: 90%;
    min-height: 8em;
    background-color: ${theme.backgroundColor};
    color: ${theme.textColor};
    border-radius: calc(${theme.normalRound} * 3) calc(${theme.normalRound} * 3) 0 0;
    box-shadow: 0 -4px 24px rgba(0, 0, 0, calc(${theme.maskAlpha} - 0.05));
    will-change: transform;
    outline: none;
    padding: 0 1.2em calc(1.2em + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)));
    overflow: hidden;
  }
  :host([paddingless]) .sheet {
    padding: 0;
    min-height: 0;
  }
  :host([paddingless]:not([header])) {
    --safe-area-inset-top: 0.35em;
  }
  :host([paddingless]:not([header])) .header-area {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
  }
  .header-area {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    z-index: 2;
  }
  .header-area::before {
    content: '';
    align-self: center;
    width: 2.5em;
    margin: 0.65em 0 0.35em;
    border-radius: 1em;
  }
  :host(:not([disable-gesture])) .header-area::before {
    background: ${theme.disabledColor};
    height: 0.3em;
  }
  .header {
    font-size: 1.0625em;
    font-weight: bold;
    color: ${theme.highlightColor};
    text-align: center;
    user-select: none;
    padding: 0.35em 0 0.75em;
    flex-shrink: 0;
  }
  .body {
    flex-grow: 1;
    flex-shrink: 1;
    min-height: 0;
    overscroll-behavior: contain;
  }
`;

export interface SheetOptions {
  header?: string | TemplateResult;
  body?: string | TemplateResult;
  maskClosable?: boolean;
  disableGesture?: boolean;
  open?: boolean;
  hasStack?: boolean;
  paddingless?: boolean;
  snap?: boolean | number[];
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
  @boolattribute disableGesture: boolean;
  @boolattribute paddingless: boolean;
  @property snap?: boolean | number[];
  @attribute header: string;
  @attribute body: string;

  @emitter close: Emitter;
  @emitter maskclick: Emitter;

  @state closing: boolean;

  headerSlot?: string | TemplateResult;
  bodySlot?: string | TemplateResult;

  /** Opens a sheet; settles when dismissed (mask / gesture / CloseWatcher). */
  static open(options: SheetOptions = {}) {
    const sheet = new this({
      ...options,
      paddingless: options.paddingless ?? options.hasStack,
      body: !options.hasStack
        ? options.body
        : html`
            <tap-stack .autoHeight=${!options.snap} disable-history .maxHeight=${innerHeight * 0.77}>
              ${options.body}
            </tap-stack>
          `,
      open: true,
    });
    const restoreInert = setBodyInert(sheet);
    document.body.append(sheet);
    return DyPromise.new<void, { sheet: TapSheetElement }>(
      (res) => {
        sheet.addEventListener('close', () => res());
      },
      { sheet },
    ).finally(async () => {
      sheet.closing = true;
      await sheet.#finishClose();
      restoreInert();
      sheet.remove();
    });
  }

  constructor(options: SheetOptions = {}) {
    super();
    const { open, snap, maskClosable, disableGesture, header, body, paddingless } = options;
    if (open) this.open = open;
    if (maskClosable) this.maskClosable = maskClosable;
    if (paddingless) this.paddingless = paddingless;
    if (disableGesture) this.disableGesture = disableGesture;
    if (snap) this.snap = snap;
    this.headerSlot = header;
    this.bodySlot = body;
  }

  #sheetRef = createRef<TapPullContainerElement>();
  #bodyRef = createRef<HTMLElement>();
  #state = createState({ offset: 0 });
  #closeSpeed = 0;
  #dragStartOffset = 0;

  get #snaps(): number[] {
    if (this.snap === true) return [0.45, 0.9];
    if (Array.isArray(this.snap)) return [...this.snap].sort((a, b) => a - b);
    return [];
  }

  get #snapOffsets() {
    const snaps = this.#snaps;
    const maxHeight = snaps.length ? snaps.at(-1)! * innerHeight : this.#height;
    const offsets = snaps.length ? snaps.map((s) => Math.max(0, maxHeight - s * innerHeight)) : [0];
    return { maxHeight, offsets };
  }

  get #header() {
    return this.header || this.headerSlot;
  }

  get #body() {
    return this.body || this.bodySlot;
  }

  get #height() {
    return this.#sheetRef.value?.borderBoxSize.blockSize || this.#sheetRef.value?.offsetHeight || 0;
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
      return clamp(SHEET_DURATION_MIN, 3 * (distance / speed), SHEET_DURATION);
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
    this.#closeSpeed = 0;
    await this.#animateOffset(from, height, { duration: SHEET_DURATION });
  };

  #onPointerDown = () => {
    this.#dragStartOffset = this.#state.offset;
  };

  #onPull = (evt: CustomEvent<PullEventDetail>) => {
    this.#state({ offset: this.#dragStartOffset + evt.detail.distance });
  };

  #onPush = (evt: CustomEvent<PushEventDetail>) => {
    this.#state({ offset: Math.max(0, this.#dragStartOffset - evt.detail.distance) });
  };

  #onGestureEnd = async (evt: CustomEvent<PullEndEventDetail | PushEndEventDetail>) => {
    const { offset } = this.#state;
    const { maxHeight, offsets } = this.#snapOffsets;
    const { swipe } = evt.detail;
    const speed = swipe ? swipe.speed : 0;
    const isDown = swipe?.direction === 'bottom' && speed > 0.5;
    const isUp = swipe?.direction === 'top' && speed > 0.5;

    const lowestOffset = offsets[0];

    if (isDown && offset >= lowestOffset) {
      this.#closeSpeed = speed;
      this.#close();
      return;
    }
    if (offset > lowestOffset + (maxHeight - lowestOffset) * 0.33) {
      this.#close();
      return;
    }

    let target = offsets[0];
    if (isUp) {
      target = offsets.find((o) => o < offset) ?? offsets.at(-1)!;
    } else if (isDown) {
      target = offsets.find((o) => o > offset) ?? lowestOffset;
    } else {
      target = offsets.reduce((prev, curr) => (Math.abs(curr - offset) < Math.abs(prev - offset) ? curr : prev));
    }

    await this.#animateOffset(offset, target, {
      duration: this.#duration(Math.abs(target - offset), maxHeight, speed),
    });
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
      const { maxHeight, offsets } = this.#snapOffsets;
      this.#animateOffset(maxHeight, offsets[0]);
    } else if (this.closing) {
      await this.#finishClose();
      this.closing = false;
      this.#state({ offset: 0 });
    }
  };

  render = () => {
    if (!this.open && !this.closing) return html``;

    const { offset } = this.#state;
    const { maxHeight, offsets } = this.#snapOffsets;
    const lowestOffset = offsets[0];
    const maskProgress =
      maxHeight === lowestOffset
        ? 1 - offset / (maxHeight || 1)
        : 1 - (offset - lowestOffset) / (maxHeight - lowestOffset || 1);

    return html`
      <div
        class="mask"
        style=${styleMap({ opacity: clamp(0, maskProgress, 1) })}
        @click=${this.#onMaskClick}
      ></div>
      <tap-pull-container
        ${this.#sheetRef}
        part=${TapSheetElement.sheet}
        role="dialog"
        tabindex="0"
        aria-modal="true"
        class="sheet"
        style=${styleMap({
          transform: `translateY(${offset}px)`,
          height: this.#snaps.length ? `${maxHeight}px` : undefined,
        })}
        disable-scroll-mask
        detect-swipe
        ?disable-gesture=${this.disableGesture || this.closing}
        ?disable-scroll=${offset > 0}
        @pointerdown=${this.#onPointerDown}
        @pull=${this.#onPull}
        @pull-end=${this.#onGestureEnd}
        @push=${this.#onPush}
        @push-end=${this.#onGestureEnd}
      >
        <div class="header-area">
          <div v-if=${!!this.#header} part=${TapSheetElement.header} class="header" role="heading" aria-level="1">
            <slot name=${TapSheetElement.header}>${this.#header}</slot>
          </div>
        </div>
        <tap-scroll-box ${this.#bodyRef} class="body" part=${TapSheetElement.body}>
          <slot>${this.#body}</slot>
        </tap-scroll-box>
      </tap-pull-container>
    `;
  };
}

export const Sheet = TapSheetElement;
