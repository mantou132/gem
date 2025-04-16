import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  aria,
  attribute,
  boolattribute,
  customElement,
  emitter,
  globalemitter,
  mounted,
  part,
  property,
  shadow,
} from '@mantou/gem/lib/decorators';
import { css, GemElement, html } from '@mantou/gem/lib/element';
import { addListener } from '@mantou/gem/lib/utils';

import { getDisplayKey, normalizeKey } from '../lib/hotkeys';
import { icons } from '../lib/icons';
import { focusStyle } from '../lib/styles';
import { theme } from '../lib/theme';
import { isNotNullish } from '../lib/types';

import './paragraph';
import './use';

const style = css`
  :host(:where(:not([hidden]))) {
    display: inline-flex;
    font-size: 0.875em;
    box-sizing: border-box;
    inline-size: 15em;
    block-size: calc(2.2em + 2px);
    border-radius: ${theme.normalRound};
    border: 1px solid ${theme.borderColor};
  }
  :host(:not([disabled])) {
    box-shadow: ${theme.controlShadow};
  }
  :host(:where(:focus, :hover)) {
    border-color: ${theme.primaryColor};
  }
  :host(:focus) {
    background-color: ${theme.lightBackgroundColor};
  }
  :host([disabled]) {
    cursor: not-allowed;
    border-color: transparent;
    background: ${theme.disabledColor};
  }
  .paragraph {
    display: flex;
    align-items: center;
    flex-grow: 1;
    gap: 0.2em;
    padding-inline: 0.4em;
    margin: 0;
    line-height: 1.2;
  }
  .placeholder,
  .tooltip {
    color: ${theme.describeColor};
    -webkit-user-select: none;
    user-select: none;
  }
  :host(:focus) .placeholder {
    display: none;
  }
  .tooltip {
    font-style: italic;
  }
  :host(:not(:focus)) .tooltip {
    display: none;
  }
  .clear {
    inline-size: 1.25em;
    flex-shrink: 0;
    opacity: 0.2;
    padding-inline: 0.35em;
    margin-inline-start: -0.35em;
    transition: opacity 0.1s;
  }
  :host(:where([disabled], :not(:focus-within, :hover))) .clear {
    display: none;
  }
  .clear:hover {
    opacity: 0.4;
  }
  @media (hover: none) {
    .clear {
      display: block;
    }
  }
`;

@customElement('dy-shortcut-record')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
@shadow()
@aria({ focusable: true, role: 'input' })
export class DuoyunShortcutRecordElement extends GemElement {
  @part static kbd: string;

  @attribute placeholder: string;
  @attribute tooltip: string;
  @boolattribute disabled: boolean;
  @boolattribute clearable: boolean;
  @globalemitter change: Emitter<string[]>;
  @emitter clear: Emitter;

  @property value?: string[];

  get #tooltip() {
    return this.tooltip || 'Please keypress...';
  }

  #onKeydown = (evt: KeyboardEvent) => {
    const keys = [
      ...new Set(
        [
          evt.ctrlKey ? 'ctrl' : null,
          evt.metaKey ? 'meta' : null,
          evt.shiftKey ? 'shift' : null,
          evt.altKey ? 'alt' : null,
          evt.code,
        ]
          .filter(isNotNullish)
          .map(normalizeKey),
      ),
    ];
    this.change(keys);
    this.focus({ focusVisible: false });
    evt.stopPropagation();
    evt.preventDefault();
  };

  #onClear = () => {
    this.clear(null);
    // 由于 target 不能聚集，所以会自动聚焦到 this 上
  };

  @mounted()
  #init = () => addListener(this, 'keydown', this.#onKeydown);

  render = () => {
    return html`
      <dy-paragraph class="paragraph">
        ${
          this.value
            ? html`${this.value.map(
                (key) => html`<kbd part=${DuoyunShortcutRecordElement.kbd}>${getDisplayKey(key)}</kbd>`,
              )}`
            : html`
              <div class="placeholder">${this.placeholder}</div>
              <div class="tooltip">${this.#tooltip}</div>
            `
        }
      </dy-paragraph>
      <dy-use
        v-if=${this.clearable}
        class="clear"
        role="button"
        @click=${this.#onClear}
        .element=${icons.close}
      ></dy-use>
    `;
  };
}
