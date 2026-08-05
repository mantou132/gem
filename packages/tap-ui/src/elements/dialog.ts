import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  attribute,
  boolattribute,
  connectStore,
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
import { createRef, css, GemElement, html, TemplateResult } from '@mantou/gem/lib/element';
import { styled } from '@mantou/gem/lib/utils';

import { commonAnimationOptions, fadeIn, fadeOut, slideInUp } from '../lib/animations';
import { setBodyInert } from '../lib/element';
import { locale } from '../lib/locale';
import { theme } from '../lib/theme';
import { DyPromise, ignoredPromiseReasonSet } from '../lib/utils';

import './button';
import './divider';
import './scroll-box';

const style = css`
  /* dialog 可能会在刷新前后保持打开 */
  :host {
    view-transition-name: tap-dialog;
    position: fixed;
    z-index: ${theme.popupZIndex};
    top: var(--titlebar-area-height, env(titlebar-area-height, 0px));
    left: 0;
    width: 100%;
    height: calc(100% - var(--titlebar-area-height, env(titlebar-area-height, 0px)));
    display: none;
    align-items: center;
    justify-content: center;
  }
  :host(:not([hidden]):where([open], :state(closing))) {
    display: flex;
  }
  .absolute {
    position: absolute;
  }
  .mask {
    inset: 0;
    background-color: rgba(0, 0, 0, calc(${theme.maskAlpha} + 0.2));
  }
  .dialog {
    outline: none;
  }
  .main {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    min-width: 20em;
    min-height: 10em;
    max-height: 80%;
    max-width: 90%;
    background-color: ${theme.backgroundColor};
    color: ${theme.textColor};
    padding: 1.5em 1.2em;
    box-shadow: 0 5px 10px rgba(0, 0, 0, calc(${theme.maskAlpha} - 0.15));
    border-radius: calc(${theme.normalRound} * 3);
  }
  .header {
    font-size: 1.125em;
    color: ${theme.highlightColor};
    font-weight: bold;
    user-select: none;
    padding-bottom: 0.5em;
    text-align: center;
  }
  .header-divider {
    margin-block-end: 1em;
  }
  .body {
    flex-grow: 1;
    flex-shrink: 1;
    overflow: auto;
    scrollbar-width: none;
    overscroll-behavior: contain;
    min-height: 2em;
    text-align: center;
  }
  .footer {
    margin-top: 1em;

    * {
      width: 0;
      flex-grow: 1;
    }
  }
  .footer,
  slot[name='footer']::slotted(*) {
    display: flex;
    gap: 0.7em;
  }
`;

const style2 = css({
  p: styled`
    margin: 0;
  `,
  c: styled`
    &::first-letter {
      text-transform: capitalize;
    }
  `,
});

export interface DialogOptions {
  header?: string | TemplateResult;
  body?: string | TemplateResult;
  footer?: string | TemplateResult;
  /**render body only */
  customize?: boolean;
  maskClosable?: boolean;
  open?: boolean;
  disableDefaultCancelBtn?: boolean;
  disableDefaultOKBtn?: boolean;
  dangerDefaultOkBtn?: boolean;
  cancelText?: string;
  okText?: string;
}

export interface DialogOpenOptions<T> {
  prepareClose?: (ele: T) => void | Promise<void>;
  prepareOk?: (ele: T) => void | Promise<void>;
}

@customElement('tap-dialog')
@adoptedStyle(style)
@adoptedStyle(style2)
@connectStore(locale)
@shadow({ delegatesFocus: true })
export class TapDialogElement extends GemElement {
  @part static dialog: string;
  @part static divider: string;
  @part @slot static header: string;
  @part static body: string;
  @slot static unnamed: string;
  @part @slot static footer: string;

  @boolattribute open: boolean;
  @boolattribute customize: boolean;
  @boolattribute maskClosable: boolean;
  @attribute okText: string;
  @attribute cancelText: string;
  @boolattribute disableDefaultCancelBtn: boolean;
  @boolattribute disableDefaultOKBtn: boolean;
  @boolattribute dangerDefaultOkBtn: boolean;
  @attribute header: string;
  @attribute body: string;

  @emitter close: Emitter;
  @emitter ok: Emitter;
  @emitter maskclick: Emitter;

  @property openAnimation: PropertyIndexedKeyframes | Keyframe[] = slideInUp;
  @property closeAnimation: PropertyIndexedKeyframes | Keyframe[] = fadeOut;

  @state closing: boolean;

  headerSlot?: string | TemplateResult;
  bodySlot?: string | TemplateResult;
  footerSlot?: string | TemplateResult;

  // Cannot be used for dynamic forms
  static open<T = Element>(options: DialogOptions & DialogOpenOptions<T>) {
    const dialog = new this({ ...options, open: true });
    const restoreInert = setBodyInert(dialog);
    document.body.append(dialog);
    // bubble close event close dialog
    return DyPromise.new<T, { modal: TapDialogElement }>(
      (res, rej) => {
        const getBodyEle = () => {
          const ele = dialog.#bodyRef.value?.children[0] as any;
          return ele instanceof HTMLSlotElement ? ele.assignedElements()[0] : ele;
        };
        dialog.addEventListener('close', async () => {
          const ele = getBodyEle();
          await options.prepareClose?.(ele);
          ignoredPromiseReasonSet.add(ele || document.body);
          rej(ele);
        });
        dialog.addEventListener('ok', async () => {
          const ele = getBodyEle();
          await options.prepareOk?.(ele);
          res(ele);
        });
      },
      { modal: dialog },
    ).finally(async () => {
      restoreInert();
      await dialog.#closeAnimate();
      dialog.remove();
    });
  }

  static confirm(body: string | TemplateResult | Record<string, unknown>, options?: DialogOptions) {
    const content =
      typeof body === 'string' || body instanceof TemplateResult
        ? html`<div class=${style2.c}>${body}</div>`
        : html`<pre class=${style2.p}>${JSON.stringify(body, null, 2)}</pre>`;
    // biome-ignore lint/complexity/noThisInStatic: Drawer / Dialog
    return this.open({ ...options, body: content }).catch(() => {
      throw null;
    });
  }

  constructor(options: DialogOptions = {}) {
    super();
    const {
      open,
      customize,
      maskClosable,
      cancelText,
      okText,
      disableDefaultCancelBtn,
      disableDefaultOKBtn,
      dangerDefaultOkBtn,
      header,
      body,
      footer,
    } = options;
    if (customize) this.customize = customize;
    if (maskClosable) this.maskClosable = maskClosable;
    if (open) this.open = open;
    if (cancelText) this.cancelText = cancelText;
    if (okText) this.okText = okText;
    if (disableDefaultCancelBtn) this.disableDefaultCancelBtn = disableDefaultCancelBtn;
    if (disableDefaultOKBtn) this.disableDefaultOKBtn = disableDefaultOKBtn;
    if (dangerDefaultOkBtn) this.dangerDefaultOkBtn = dangerDefaultOkBtn;
    this.headerSlot = header;
    this.bodySlot = body;
    this.footerSlot = footer;
  }

  get #header() {
    return this.header || this.headerSlot;
  }

  get #body() {
    return this.body || this.bodySlot;
  }

  #maskRef = createRef<HTMLElement>();
  #dialogRef = createRef<HTMLElement>();
  #customizeBodyRef = createRef<HTMLElement>();
  #bodySlotRef = createRef<HTMLSlotElement>();

  get #bodyRef() {
    return this.customize ? this.#customizeBodyRef : this.#bodySlotRef;
  }

  get #animationEleRef() {
    return this.customize ? this.#customizeBodyRef : this.#dialogRef;
  }

  #close = () => {
    this.close(null);
  };

  #ok = () => {
    this.ok(null);
  };

  #onMaskClick = () => {
    this.focus();
    this.maskclick(null);
    if (this.maskClosable) this.#close();
  };

  #openAnimate = () => {
    this.#maskRef.value?.animate(fadeIn, commonAnimationOptions);
    this.#animationEleRef.value?.animate(this.openAnimation, commonAnimationOptions);
  };

  #closeAnimate = () =>
    Promise.all([
      this.#maskRef.value?.animate(fadeOut, commonAnimationOptions).finished,
      this.#animationEleRef.value?.animate(this.closeAnimation, commonAnimationOptions).finished,
    ]);

  @memo((i) => [i.open])
  #updateState = (_: [boolean], oldDeps?: [boolean]) => {
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
      this.#openAnimate();
    } else if (this.closing) {
      await this.#closeAnimate();
      this.closing = false;
      this.update();
    }
  };

  render = () => {
    if (!this.open && !this.closing) return html``;

    return html`
      <div ${this.#maskRef} class="mask absolute" @click=${this.#onMaskClick}></div>
      <div
        ${this.#customizeBodyRef}
        v-if=${this.customize}
        part=${TapDialogElement.dialog}
        role="dialog"
        tabindex="0"
        aria-modal="true"
        class="dialog absolute"
      >
        ${this.#body || html`<slot></slot>`}
      </div>
      <div
        ${this.#dialogRef}
        v-else
        part=${TapDialogElement.dialog}
        role="dialog"
        tabindex="0"
        aria-modal="true"
        class="dialog main absolute"
      >
        <div
          v-if=${!!this.#header}
          part=${TapDialogElement.header}
          role="heading"
          aria-level="1"
          class="header"
        >
          <slot name=${TapDialogElement.header}>${this.#header}</slot>
        </div>
        <tap-divider
          v-if=${!!this.#header}
          part=${TapDialogElement.divider}
          class="header-divider"
          size="medium"
        ></tap-divider>
        <tap-scroll-box class="body" part=${TapDialogElement.body}>
          <slot ${this.#bodySlotRef}>${this.#body}</slot>
        </tap-scroll-box>
        <div class="footer" part=${TapDialogElement.footer}>
          <slot name=${TapDialogElement.footer}>
            ${
              this.footerSlot ||
              html`
                <tap-button ?hidden=${this.disableDefaultCancelBtn} @click=${this.#close} .color=${'cancel'}>
                  ${this.cancelText || locale.cancel}
                </tap-button>
                <tap-button
                  ?hidden=${this.disableDefaultOKBtn}
                  .color=${this.dangerDefaultOkBtn ? 'danger' : 'normal'}
                  @click=${this.#ok}
                >
                  ${this.okText || locale.ok}
                </tap-button>
              `
            }
          </slot>
        </div>
      </div>
    `;
  };
}

export const Dialog = TapDialogElement;
