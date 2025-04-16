import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  attribute,
  boolattribute,
  customElement,
  emitter,
  property,
  shadow,
  slot,
} from '@mantou/gem/lib/decorators';
import { createState, css, GemElement, html } from '@mantou/gem/lib/element';
import { classMap } from '@mantou/gem/lib/utils';

import { commonHandle } from '../lib/hotkeys';
import { icons } from '../lib/icons';
import { locale } from '../lib/locale';
import { focusStyle } from '../lib/styles';
import { theme } from '../lib/theme';

import './use';
import '../elements/tooltip';

const style = css`
  :host(:where(:not([hidden]))) {
    position: relative;
    display: flex;
    gap: 0.5em;
  }
  :host(:hover) .icon {
    display: flex;
  }
  .icon {
    cursor: pointer;
    flex-shrink: 0;
    width: 1.2em;
  }
  .icon.none {
    display: none;
  }
  .icon.success {
    color: ${theme.positiveColor};
  }
  :host([block]) .icon {
    position: absolute;
    top: 1em;
    right: 1em;
  }
  .tip {
    z-index: ${theme.popupZIndex};
    position: absolute;
    top: 50%;
    left: 100%;
    transform: translate(0.8em, -50%);
    background: currentColor;
    line-height: 1.5;
    padding: 0.4em 0.6em;
    border-radius: ${theme.normalRound};
    white-space: nowrap;
    filter: drop-shadow(rgba(0, 0, 0, calc(${theme.maskAlpha})) 0px 7px 14px);
  }
  .text {
    color: ${theme.backgroundColor};
  }
  .tip::before {
    content: '';
    position: absolute;
    border-style: solid;
    top: 50%;
    right: 100%;
    border-color: transparent currentColor transparent transparent;
    border-width: 0.4em 0.4em 0.4em 0;
    transform: translateY(-50%);
  }
  slot::slotted(*) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

type Status = 'none' | 'success' | 'fail';

@customElement('dy-copy')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
@shadow({ delegatesFocus: true })
export class DuoyunCopyElement extends GemElement {
  @slot static unnamed: string;
  @slot static after: string;

  @boolattribute silent: boolean;
  @boolattribute block: boolean;
  @attribute tooltip: string;

  @property content?: string;

  @emitter copy: Emitter<boolean>;

  get #icon() {
    switch (this.#state.status) {
      case 'success':
        return icons.check;
      case 'fail':
        return icons.close;
      default:
        return icons.copy;
    }
  }

  #state = createState({
    status: 'none' as Status,
  });

  #showMessage = (isSuccess: boolean) => {
    this.copy(isSuccess);
    if (!this.silent) {
      this.#state({ status: isSuccess ? 'success' : 'fail' });
      setTimeout(() => {
        this.#state({ status: 'none' });
      }, 1000);
    }
  };

  #copy = async () => {
    if (this.#state.status !== 'none') return;
    try {
      await navigator.clipboard.writeText(this.content || this.textContent || '');
      this.#showMessage(true);
    } catch {
      this.#showMessage(false);
    }
  };

  render = () => {
    const { status } = this.#state;
    return html`
      <slot></slot>
      <dy-tooltip .content=${this.tooltip}>
        <dy-use
          role="button"
          tabindex="0"
          class=${classMap({ icon: true, [status]: true })}
          @click=${this.#copy}
          @keydown=${commonHandle}
          .element=${this.#icon}
        >
          <div v-if=${status !== 'none'} class="tip">
            <span class="text">${status === 'fail' ? locale.copyFail : locale.copySuccess}</span>
          </div>
        </dy-use>
      </dy-tooltip>
      <slot name=${DuoyunCopyElement.after}></slot>
    `;
  };
}
