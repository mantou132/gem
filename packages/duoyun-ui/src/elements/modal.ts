import {
  connectStore,
  adoptedStyle,
  customElement,
  attribute,
  emitter,
  Emitter,
  property,
  boolattribute,
  refobject,
  RefObject,
  part,
  state,
  slot,
} from '@mantou/gem/lib/decorators';
import { GemElement, html, TemplateResult } from '@mantou/gem/lib/element';
import { addListener, createCSSSheet, css, styled } from '@mantou/gem/lib/utils';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';

import { theme } from '../lib/theme';
import { locale } from '../lib/locale';
import { hotkeys } from '../lib/hotkeys';
import { DyPromise, setBodyInert } from '../lib/utils';
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
  :host(:not([hidden]):where([open], :where([data-closing], :state(closing)))) {
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
  .body::-webkit-scrollbar {
    width: 0;
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
export class DuoyunModalElement extends GemElement {
  @boolattribute open: boolean;
  @boolattribute customize: boolean;
  @boolattribute maskClosable: boolean;
  @attribute okText: string;
  @attribute cancelText: string;
  @boolattribute disableDefaultCancelBtn: boolean;
  @boolattribute disableDefaultOKBtn: boolean;
  @boolattribute dangerDefaultOkBtn: boolean;

  @emitter close: Emitter;
  @emitter ok: Emitter;
  @emitter maskclick: Emitter;

  @property header?: string | TemplateResult;
  @property body?: string | TemplateResult;
  @property openAnimation: PropertyIndexedKeyframes | Keyframe[] = slideInUp;
  @property closeAnimation: PropertyIndexedKeyframes | Keyframe[] = fadeOut;

  @refobject maskRef: RefObject<HTMLElement>;
  @refobject dialogRef: RefObject<HTMLElement>;
  @refobject bodyRef: RefObject<HTMLElement>;

  @part static dialog: string;
  @part static heading: string;
  @part static divider: string;
  @part static body: string;
  @part @slot static footer: string;
  // break change: body -> unnamed
  @slot static unnamed: string;

  @state closing: boolean;

  // Cannot be used for dynamic forms
  // 错误必须处理，不然会被默认通过 Toast 显示
  static open<T = Element>(options: ModalOptions & ModalOpenOptions<T>) {
    const modal = new this({ ...options, open: true });
    const restoreInert = setBodyInert(modal);
    document.body.append(modal);
    // bubble close event close modal
    return DyPromise.new<T, { modal: DuoyunModalElement }>(
      (res, rej) => {
        const getBodyEle = () => {
          const ele = modal.bodyRef.element?.children[0] as any;
          return ele instanceof HTMLSlotElement ? ele.assignedElements()[0] : ele;
        };
        modal.addEventListener('close', async () => {
          const ele = getBodyEle();
          await options.prepareClose?.(ele);
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
    super({ delegatesFocus: true });
    const {
      header,
      open,
      customize,
      maskClosable,
      cancelText,
      okText,
      body,
      disableDefaultCancelBtn,
      disableDefaultOKBtn,
      dangerDefaultOkBtn,
    } = options;
    if (header) this.header = header;
    if (customize) this.customize = customize;
    if (maskClosable) this.maskClosable = maskClosable;
    if (open) this.open = open;
    if (cancelText) this.cancelText = cancelText;
    if (okText) this.okText = okText;
    if (disableDefaultCancelBtn) this.disableDefaultCancelBtn = disableDefaultCancelBtn;
    if (disableDefaultOKBtn) this.disableDefaultOKBtn = disableDefaultOKBtn;
    if (dangerDefaultOkBtn) this.dangerDefaultOkBtn = dangerDefaultOkBtn;
    if (body) this.body = body;
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

  #keydown = (evt: KeyboardEvent) => {
    evt.stopPropagation();
    hotkeys({ esc: this.#close })(evt);
  };

  willMount = () => {
    this.memo(
      (_, oldDeps) => oldDeps && (this.closing = !this.open),
      () => [this.open],
    );
  };

  #openAnimate = () => {
    this.maskRef.element?.animate(fadeIn, commonAnimationOptions);
    (this.dialogRef.element || this.bodyRef.element)?.animate(this.openAnimation, commonAnimationOptions);
  };

  #closeAnimate = () =>
    Promise.all([
      this.maskRef.element?.animate(fadeOut, commonAnimationOptions).finished,
      (this.dialogRef.element || this.bodyRef.element)?.animate(this.closeAnimation, commonAnimationOptions).finished,
    ]);

  mounted = () => {
    this.effect(
      async () => {
        if (this.open) {
          !this.shadowRoot?.activeElement && this.focus();
          this.#openAnimate();
        } else if (this.closing) {
          await this.#closeAnimate();
          this.closing = false;
          this.update();
        }
      },
      () => [this.open],
    );
    return addListener(this, 'keydown', this.#keydown);
  };

  render = () => {
    if (!this.open && !this.closing) return html``;

    return html`
      <div class="mask absolute" ref=${this.maskRef.ref} @click=${this.#onMaskClick}></div>
      ${this.customize
        ? html`
            <div
              ref=${this.bodyRef.ref}
              part=${DuoyunModalElement.dialog}
              role="dialog"
              tabindex="0"
              aria-modal="true"
              class="dialog absolute"
            >
              ${this.body || html`<slot></slot>`}
            </div>
          `
        : html`
            <div
              ref=${this.dialogRef.ref}
              part=${DuoyunModalElement.dialog}
              role="dialog"
              tabindex="0"
              aria-modal="true"
              class="dialog main absolute"
            >
              ${this.header
                ? html`
                    <div part=${DuoyunModalElement.heading} role="heading" aria-level="1" class="header">
                      ${this.header}
                    </div>
                    <dy-divider part=${DuoyunModalElement.divider} class="header-divider" size="medium"></dy-divider>
                  `
                : ''}
              <dy-scroll-box class="body" part=${DuoyunModalElement.body}>
                <slot ref=${this.bodyRef.ref}>${this.body}</slot>
              </dy-scroll-box>
              <div class="footer" part=${DuoyunModalElement.footer}>
                <slot name=${DuoyunModalElement.footer}>
                  <dy-button ?hidden=${this.disableDefaultCancelBtn} @click=${this.#close} .color=${'cancel'}>
                    ${this.cancelText || locale.cancel}
                  </dy-button>
                  <dy-button
                    ?hidden=${this.disableDefaultOKBtn}
                    .color=${this.dangerDefaultOkBtn ? 'danger' : 'normal'}
                    @click=${this.#ok}
                    >${this.okText || locale.ok}</dy-button
                  >
                </slot>
              </div>
            </div>
          `}
    `;
  };
}

export const Modal = DuoyunModalElement;
