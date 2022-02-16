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
} from '@mantou/gem/lib/decorators';
import { GemElement, html, TemplateResult } from '@mantou/gem/lib/element';
import { createCSSSheet, css, styled } from '@mantou/gem/lib/utils';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';

import { theme } from '../lib/theme';
import { locale } from '../lib/locale';
import { hotkeys } from '../lib/hotkeys';
import { setBodyInert } from '../lib/utils';

import './button';
import './divider';

const style = createCSSSheet(css`
  :host {
    position: fixed;
    z-index: ${theme.popupZIndex};
    top: env(titlebar-area-height, 0);
    left: 0;
    width: 100%;
    height: calc(100% - env(titlebar-area-height, 0px));
    display: none;
  }
  .absolute {
    position: absolute;
  }
  .dialog {
    outline: none;
  }
  .mask {
    inset: 0;
    animation: showbg 0.1s ${theme.timingFunction} forwards;
  }
  @keyframes showbg {
    0% {
      background-color: transparent;
    }
    100% {
      background-color: rgba(0, 0, 0, calc(${theme.maskAlpha} + 0.2));
    }
  }
  :host([open]) {
    display: flex;
    align-items: center;
    justify-content: center;
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
    border-radius: 0.75em;
    animation: showmain 0.1s ${theme.timingFunction} forwards;
  }
  @keyframes showmain {
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

export interface Options {
  header?: string | TemplateResult;
  body?: string | TemplateResult;
  /**render body only */
  customize?: boolean;
  maskCloseable?: boolean;
  open?: boolean;
  disableDefualtCancelBtn?: boolean;
  disableDefualtOKBtn?: boolean;
  dangerDefualtOkBtn?: boolean;
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
  @boolattribute maskCloseable: boolean;
  @attribute okText: string;
  @attribute cancelText: string;
  @boolattribute disableDefualtCancelBtn: boolean;
  @boolattribute disableDefualtOKBtn: boolean;
  @boolattribute dangerDefualtOkBtn: boolean;

  @emitter close: Emitter;
  @emitter ok: Emitter;
  @emitter maskclick: Emitter;

  @property header: string | TemplateResult;
  @property body?: string | TemplateResult;

  @refobject bodyRef: RefObject<HTMLSlotElement>;

  // Cannot be used for dynamic forms
  static async open<T = Element>(options: Options) {
    const modal = new this({ ...options, open: true });
    const restoreInert = setBodyInert(modal);
    document.body.append(modal);
    // bubble close event close modal
    await new Promise<T>((res, rej) => {
      modal.addEventListener('close', () => {
        rej();
      });
      modal.addEventListener('ok', () => {
        const { element } = modal.bodyRef;
        element && res(element.children[0] as any);
      });
    }).finally(() => {
      restoreInert();
      modal.remove();
    });
  }

  static confirm(body: string | TemplateResult | Record<string, unknown>, options?: Options) {
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
    maskCloseable,
    cancelText,
    okText,
    body,
    disableDefualtCancelBtn,
    disableDefualtOKBtn,
    dangerDefualtOkBtn,
  }: Options = {}) {
    super();
    if (header) this.header = header;
    if (customize) this.customize = customize;
    if (maskCloseable) this.maskCloseable = maskCloseable;
    if (open) this.open = open;
    if (cancelText) this.cancelText = cancelText;
    if (okText) this.okText = okText;
    if (disableDefualtCancelBtn) this.disableDefualtCancelBtn = disableDefualtCancelBtn;
    if (disableDefualtOKBtn) this.disableDefualtOKBtn = disableDefualtOKBtn;
    if (dangerDefualtOkBtn) this.dangerDefualtOkBtn = dangerDefualtOkBtn;
    if (body) this.body = body;
  }

  #close = () => {
    this.close(null);
  };

  #ok = () => {
    this.ok(null);
  };

  #onMaskClick = () => {
    if (this.maskCloseable) this.#close();
    this.maskclick(null);
  };

  #keydown = hotkeys({ esc: this.#close });

  mounted = () => {
    this.effect(() => {
      if (this.open) {
        this.shadowRoot!.querySelector<HTMLDivElement>('.dialog')?.focus();
      }
    });
    this.addEventListener('keydown', this.#keydown);
    return () => this.removeEventListener('keydown', this.#keydown);
  };

  render = () => {
    if (!this.open) return html``;

    return html`
      <div class="mask absolute" @click=${this.#onMaskClick}></div>
      ${this.customize
        ? html`
            <div role="dialog" tabindex="0" aria-modal="true" class="dialog absolute" ref=${this.bodyRef.ref}>
              ${this.body}
            </div>
          `
        : html`
            <div role="dialog" tabindex="0" aria-modal="true" class="dialog main absolute">
              ${this.header
                ? html`
                    <div role="heading" aria-level="1" class="header">${this.header}</div>
                    <dy-divider class="header-divider" size="medium"></dy-divider>
                  `
                : ''}
              <div class="body">
                <slot name="body" ref=${this.bodyRef.ref}>${this.body}</slot>
              </div>
              <div class="footer">
                <slot name="footer">
                  <dy-button ?hidden=${this.disableDefualtCancelBtn} @click=${this.#close} .color=${'cancel'}>
                    ${this.cancelText || locale.cancel}
                  </dy-button>
                  <dy-button
                    ?hidden=${this.disableDefualtOKBtn}
                    .color=${this.dangerDefualtOkBtn ? 'danger' : 'normal'}
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
