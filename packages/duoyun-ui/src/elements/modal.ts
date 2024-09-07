import {
  connectStore,
  adoptedStyle,
  customElement,
  attribute,
  emitter,
  Emitter,
  property,
  boolattribute,
  part,
  state,
  slot,
  shadow,
  mounted,
  effect,
  memo,
} from '@mantou/gem/lib/decorators';
import { createCSSSheet, createRef, GemElement, html, TemplateResult } from '@mantou/gem/lib/element';
import { addListener, css, styled } from '@mantou/gem/lib/utils';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';

import { theme } from '../lib/theme';
import { locale } from '../lib/locale';
import { hotkeys } from '../lib/hotkeys';
import { DyPromise, ignoredPromiseReasonSet } from '../lib/utils';
import { setBodyInert } from '../lib/element';
import { commonAnimationOptions, fadeIn, fadeOut, slideInUp } from '../lib/animations';

import './button';
import './divider';
import './scroll-box';

const style = createCSSSheet(css`
  /* modal 可能会在刷新前后保持打开 */
  :host {
    view-transition-name: dy-modal;
    position: fixed;
    z-index: ${theme.popupZIndex};
    top: env(titlebar-area-height, var(--titlebar-area-height, 0px));
    left: 0;
    width: 100%;
    height: calc(100% - env(titlebar-area-height, var(--titlebar-area-height, 0px)));
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
  }
  .footer {
    margin-top: 1.5em;
  }
  .footer,
  slot[name='footer']::slotted(*) {
    display: flex;
    justify-content: flex-end;
    gap: 0.7em;
  }
  @media ${mediaQuery.PHONE} {
    .main {
      max-width: 100%;
      max-height: 100%;
      width: 100%;
      height: 100%;
    }
  }
`);

const style2 = createCSSSheet({
  p: styled.class`
    margin: 0;
  `,
  c: styled.class`
    &::first-letter {
      text-transform: capitalize;
    }
  `,
});

export interface ModalOptions {
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

export interface ModalOpenOptions<T> {
  prepareClose?: (ele: T) => void | Promise<void>;
  prepareOk?: (ele: T) => void | Promise<void>;
}

/**
 * @customElement dy-modal
 * @fires ok
 * @fires close
 * @fires maskclick
 */
@customElement('dy-modal')
@adoptedStyle(style)
@adoptedStyle(style2)
@connectStore(locale)
@shadow({ delegatesFocus: true })
export class DuoyunModalElement extends GemElement {
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
  static open<T = Element>(options: ModalOptions & ModalOpenOptions<T>) {
    const modal = new this({ ...options, open: true });
    const restoreInert = setBodyInert(modal);
    document.body.append(modal);
    // bubble close event close modal
    return DyPromise.new<T, { modal: DuoyunModalElement }>(
      (res, rej) => {
        const getBodyEle = () => {
          const ele = modal.#bodyRef.element?.children[0] as any;
          return ele instanceof HTMLSlotElement ? ele.assignedElements()[0] : ele;
        };
        modal.addEventListener('close', async () => {
          const ele = getBodyEle();
          await options.prepareClose?.(ele);
          ignoredPromiseReasonSet.add(ele);
          rej(ele);
        });
        modal.addEventListener('ok', async () => {
          const ele = getBodyEle();
          await options.prepareOk?.(ele);
          res(ele);
        });
      },
      { modal },
    ).finally(async () => {
      restoreInert();
      await modal.#closeAnimate();
      modal.remove();
    });
  }

  static confirm(body: string | TemplateResult | Record<string, unknown>, options?: ModalOptions) {
    const content =
      typeof body === 'string' || body instanceof TemplateResult
        ? html`<div class=${style2.c}>${body}</div>`
        : html`<pre class=${style2.p}>${JSON.stringify(body, null, 2)}</pre>`;
    return Modal.open({ ...options, body: content }).catch(() => {
      throw null;
    });
  }

  constructor(options: ModalOptions = {}) {
    super();
    const {
      header,
      open,
      customize,
      maskClosable,
      cancelText = '',
      okText = '',
      body,
      footer,
      disableDefaultCancelBtn,
      disableDefaultOKBtn,
      dangerDefaultOkBtn,
    } = options;
    this.headerSlot = header;
    this.bodySlot = body;
    this.footerSlot = footer;
    this.customize = !!customize;
    this.maskClosable = !!maskClosable;
    this.open = !!open;
    this.cancelText = cancelText;
    this.okText = okText;
    this.disableDefaultCancelBtn = !!disableDefaultCancelBtn;
    this.disableDefaultOKBtn = !!disableDefaultOKBtn;
    this.dangerDefaultOkBtn = !!dangerDefaultOkBtn;
  }

  #maskRef = createRef<HTMLElement>();
  #dialogRef = createRef<HTMLElement>();
  #bodyRef = createRef<HTMLElement>();

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

  #keydown = (evt: KeyboardEvent) => {
    evt.stopPropagation();
    hotkeys({ esc: this.#close })(evt);
  };

  #openAnimate = () => {
    this.#maskRef.element?.animate(fadeIn, commonAnimationOptions);
    (this.#dialogRef.element || this.#bodyRef.element)?.animate(this.openAnimation, commonAnimationOptions);
  };

  #closeAnimate = () =>
    Promise.all([
      this.#maskRef.element?.animate(fadeOut, commonAnimationOptions).finished,
      (this.#dialogRef.element || this.#bodyRef.element)?.animate(this.closeAnimation, commonAnimationOptions).finished,
    ]);

  @memo((i) => [i.open])
  #updateState = (_: [boolean], oldDeps?: [boolean]) => oldDeps && (this.closing = !this.open);

  @mounted()
  #init = () => addListener(this, 'keydown', this.#keydown);

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
      <div class="mask absolute" ref=${this.#maskRef.ref} @click=${this.#onMaskClick}></div>
      ${this.customize
        ? html`
            <div
              ref=${this.#bodyRef.ref}
              part=${DuoyunModalElement.dialog}
              role="dialog"
              tabindex="0"
              aria-modal="true"
              class="dialog absolute"
            >
              ${this.body || this.bodySlot || html`<slot></slot>`}
            </div>
          `
        : html`
            <div
              ref=${this.#dialogRef.ref}
              part=${DuoyunModalElement.dialog}
              role="dialog"
              tabindex="0"
              aria-modal="true"
              class="dialog main absolute"
            >
              ${this.header
                ? html`
                    <div part=${DuoyunModalElement.header} role="heading" aria-level="1" class="header">
                      <slot name=${DuoyunModalElement.header}>${this.header || this.headerSlot}</slot>
                    </div>
                    <dy-divider part=${DuoyunModalElement.divider} class="header-divider" size="medium"></dy-divider>
                  `
                : ''}
              <dy-scroll-box class="body" part=${DuoyunModalElement.body}>
                <slot ref=${this.#bodyRef.ref}>${this.body || this.bodySlot}</slot>
              </dy-scroll-box>
              <div class="footer" part=${DuoyunModalElement.footer}>
                <slot name=${DuoyunModalElement.footer}>
                  ${this.footerSlot ||
                  html`
                    <dy-button ?hidden=${this.disableDefaultCancelBtn} @click=${this.#close} .color=${'cancel'}>
                      ${this.cancelText || locale.cancel}
                    </dy-button>
                    <dy-button
                      ?hidden=${this.disableDefaultOKBtn}
                      .color=${this.dangerDefaultOkBtn ? 'danger' : 'normal'}
                      @click=${this.#ok}
                    >
                      ${this.okText || locale.ok}
                    </dy-button>
                  `}
                </slot>
              </div>
            </div>
          `}
    `;
  };
}

export const Modal = DuoyunModalElement;
