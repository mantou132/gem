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
} from '@mantou/gem/lib/decorators';
import { GemElement, html, TemplateResult } from '@mantou/gem/lib/element';
import { createCSSSheet, css, styled } from '@mantou/gem/lib/utils';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';

import { theme } from '../lib/theme';
import { locale } from '../lib/locale';
import { hotkeys } from '../lib/hotkeys';
import { setBodyInert } from '../lib/utils';
import { commonAnimationOptions, fadeOut } from '../lib/animations';

import './button';
import './divider';

const style = createCSSSheet(css`
  :host {
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
    animation: showMask 0.1s ${theme.timingFunction} forwards;
  }
  @keyframes showMask {
    0% {
      background-color: transparent;
    }
    100% {
      background-color: rgba(0, 0, 0, calc(${theme.maskAlpha} + 0.2));
    }
  }
  .dialog {
    outline: none;
    animation: showDialog 0.1s ${theme.timingFunction} forwards;
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
  @keyframes showDialog {
    0% {
      transform: translate(0, 50%);
      opacity: 0;
    }
    100% {
      transform: translate(0);
      opacity: 1;
    }
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

  @refobject bodyRef: RefObject<HTMLElement>;

  @part static dialog: string;
  @part static heading: string;
  @part static divider: string;
  @part static body: string;
  @part static footer: string;

  @state closing: boolean;

  // Cannot be used for dynamic forms
  static async open<T = Element>(options: ModalOptions) {
    const modal = new this({ ...options, open: true });
    const restoreInert = setBodyInert(modal);
    document.body.append(modal);
    // bubble close event close modal
    return new Promise<T>((res, rej) => {
      modal.addEventListener('close', () => {
        rej();
      });
      modal.addEventListener('ok', () => {
        const { element } = modal.bodyRef;
        if (element) {
          const ele = element.children[0] as any;
          res(ele instanceof HTMLSlotElement ? ele.assignedElements()[0] : ele);
        }
      });
    }).finally(async () => {
      restoreInert();
      await modal.animate(fadeOut, commonAnimationOptions).finished;
      modal.remove();
    });
  }

  static confirm(body: string | TemplateResult | Record<string, unknown>, options?: ModalOptions) {
    const content =
      typeof body === 'string' || body instanceof TemplateResult
        ? html`<div class=${style2.c}>${body}</div>`
        : html`<pre class=${style2.p}>${JSON.stringify(body, null, 2)}</pre>`;
    return Modal.open({ ...options, body: content });
  }

  constructor({
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
  }: ModalOptions = {}) {
    super({ delegatesFocus: true });
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
      () => (this.closing = !this.open),
      () => [this.open],
    );
  };

  #animation?: Animation;
  mounted = () => {
    this.effect(
      async () => {
        if (this.open) {
          this.#animation?.cancel();
          !this.shadowRoot?.activeElement && this.focus();
        } else {
          this.#animation = this.animate(fadeOut, commonAnimationOptions);
          await this.#animation.finished;
          this.closing = false;
        }
      },
      () => [this.open],
    );
    this.addEventListener('keydown', this.#keydown);
    return () => this.removeEventListener('keydown', this.#keydown);
  };

  render = () => {
    if (!this.open && !this.closing) return html``;

    return html`
      <div class="mask absolute" @click=${this.#onMaskClick}></div>
      ${this.customize
        ? html`
            <div
              part=${DuoyunModalElement.dialog}
              role="dialog"
              tabindex="0"
              aria-modal="true"
              class="dialog absolute"
              ref=${this.bodyRef.ref}
            >
              ${this.body || html`<slot name="body"></slot>`}
            </div>
          `
        : html`
            <div
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
              <div class="body" part=${DuoyunModalElement.body}>
                <slot name="body" ref=${this.bodyRef.ref}>${this.body}</slot>
              </div>
              <div class="footer" part=${DuoyunModalElement.footer}>
                <slot name="footer">
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
