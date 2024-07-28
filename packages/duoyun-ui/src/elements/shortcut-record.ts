import {
  adoptedStyle,
  customElement,
  attribute,
  globalemitter,
  Emitter,
  property,
  boolattribute,
  part,
  emitter,
  focusable,
  aria,
  shadow,
} from '@mantou/gem/lib/decorators';
import { GemElement, html, createCSSSheet } from '@mantou/gem/lib/element';
import { css } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';
import { isNotNullish } from '../lib/types';
import { normalizeKey, getDisplayKey } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';
import { icons } from '../lib/icons';

import './paragraph';
import './use';

const style = createCSSSheet(css`
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
`);

/**
 * @customElement dy-shortcut-record
 * @attr placeholder
 * @attr tooltip
 * @attr disabled
 */
@customElement('dy-shortcut-record')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
@focusable()
@aria({ role: 'input' })
@shadow()
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

  constructor() {
    super();
    this.addEventListener('keydown', this.#onKeydown);
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

  render = () => {
    return html`
      <dy-paragraph class="paragraph">
        ${this.value
          ? html`${this.value.map(
              (key) => html`<kbd part=${DuoyunShortcutRecordElement.kbd}>${getDisplayKey(key)}</kbd>`,
            )}`
          : html`
              <div class="placeholder">${this.placeholder}</div>
              <div class="tooltip">${this.#tooltip}</div>
            `}
      </dy-paragraph>
      ${this.clearable
        ? html`<dy-use class="clear" role="button" @click=${this.#onClear} .element=${icons.close}></dy-use>`
        : ''}
    `;
  };
}
