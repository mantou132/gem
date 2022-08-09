import {
  adoptedStyle,
  customElement,
  attribute,
  globalemitter,
  Emitter,
  property,
  boolattribute,
  part,
} from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';
import { isNotNullish } from '../lib/types';
import { normalizeKey, getDisplayKey } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';

import './paragraph';

const style = createCSSSheet(css`
  :host {
    display: inline-flex;
    align-items: center;
    font-size: 0.875em;
    box-sizing: border-box;
    width: 15em;
    height: calc(2.2em + 2px);
    padding-inline: 0.4em;
    gap: 0.2em;
    border-radius: ${theme.normalRound};
    border: 1px solid ${theme.borderColor};
  }
  :host(:focus) {
    border-color: ${theme.textColor};
    background-color: ${theme.lightBackgroundColor};
  }
  .paragraph {
    display: contents;
    line-height: 1.2;
  }
  .placeholder,
  .tooltip {
    color: ${theme.describeColor};
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
export class DuoyunShortcutRecordElement extends GemElement {
  @part static kbd: string;

  @attribute placeholder: string;
  @attribute tooltip: string;
  @boolattribute disabled: number;
  @globalemitter change: Emitter<string[]>;

  @property value?: string[];

  get #tooltip() {
    return this.tooltip || 'Please keypress...';
  }

  constructor() {
    super();
    this.internals.role = 'input';
    this.addEventListener('keydown', this.#onKeydown);
    this.effect(() => {
      if (this.disabled) {
        this.removeAttribute('tabindex');
      } else {
        this.tabIndex = 0;
      }
      this.internals.ariaDisabled = String(this.disabled);
    });
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
    evt.stopPropagation();
    evt.preventDefault();
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
    `;
  };
}
