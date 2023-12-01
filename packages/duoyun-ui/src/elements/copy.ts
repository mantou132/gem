import {
  adoptedStyle,
  customElement,
  attribute,
  property,
  boolattribute,
  emitter,
  Emitter,
} from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css, classMap } from '@mantou/gem/lib/utils';

import { icons } from '../lib/icons';
import { theme } from '../lib/theme';
import { locale } from '../lib/locale';
import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';

import './use';
import '../elements/tooltip';

const style = createCSSSheet(css`
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
    filter: drop-shadow(rgba(0, 0, 0, calc(${theme.maskAlpha})) 0px 0.6em 1em);
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
`);

type State = {
  status: 'none' | 'success' | 'fail';
};

/**
 * @customElement dy-copy
 */
@customElement('dy-copy')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
export class DuoyunCopyElement extends GemElement<State> {
  @boolattribute silent: boolean;
  @boolattribute block: boolean;
  @attribute tooltip: string;

  @property content?: string;

  @emitter copy: Emitter<boolean>;

  state: State = {
    status: 'none',
  };

  get #icon() {
    switch (this.state.status) {
      case 'success':
        return icons.check;
      case 'fail':
        return icons.close;
      default:
        return icons.copy;
    }
  }

  #showMessage = (isSuccess: boolean) => {
    this.copy(isSuccess);
    if (!this.silent) {
      this.setState({ status: isSuccess ? 'success' : 'fail' });
      setTimeout(() => {
        this.setState({ status: 'none' });
      }, 1000);
    }
  };

  #copy = async () => {
    if (this.state.status !== 'none') return;
    try {
      await navigator.clipboard.writeText(this.content || this.textContent || '');
      this.#showMessage(true);
    } catch {
      this.#showMessage(false);
    }
  };

  render = () => {
    const { status } = this.state;
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
          ${status === 'none'
            ? ''
            : html`
                <div class="tip">
                  <span class="text">${status === 'fail' ? locale.copyFail : locale.copySuccess}</span>
                </div>
              `}
        </dy-use>
      </dy-tooltip>
      <slot name="after"></slot>
    `;
  };
}
