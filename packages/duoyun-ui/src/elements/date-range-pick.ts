import {
  adoptedStyle,
  customElement,
  attribute,
  emitter,
  globalemitter,
  Emitter,
  property,
  boolattribute,
  state,
} from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css, classMap } from '@mantou/gem/lib/utils';

import { Time } from '../lib/time';
import { icons } from '../lib/icons';
import { theme } from '../lib/theme';
import { locale } from '../lib/locale';
import { isNotNullish } from '../lib/types';
import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';

import type { DuoyunButtonElement } from './button';
import { ContextMenu } from './menu';

import './date-range-panel';
import './button';

const style = createCSSSheet(css`
  :host {
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    border: 1px solid ${theme.borderColor};
    border-radius: ${theme.normalRound};
    line-height: 1.2;
    padding: 0.5em;
    gap: 0.5em;
    font-size: 0.875em;
    box-sizing: border-box;
    width: 18em;
  }
  :host(:where(:--active, [data-active])) {
    background-color: ${theme.lightBackgroundColor};
  }
  :host([disabled]) {
    cursor: not-allowed;
    border-color: transparent;
    background: ${theme.disabledColor};
  }
  .value {
    flex-grow: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .placeholder {
    color: ${theme.describeColor};
  }
  gem-use {
    width: 1.2em;
    color: ${theme.borderColor};
  }
  :host(:where(:hover, :--active, [data-active])) gem-use {
    color: ${theme.textColor};
  }
  .icon {
    display: flex;
  }
  .close,
  .clearable:hover .date {
    display: none;
  }
  .clearable:hover .close {
    display: inline-flex;
  }
`);

/**
 * @customElement dy-date-range-pick
 * @fires change
 * @fires clear
 */
@customElement('dy-date-range-pick')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
export class DuoyunDateRangePickElement extends GemElement {
  @attribute placeholder: string;
  @boolattribute clearable: boolean;
  @boolattribute disabled: boolean;
  @boolattribute time: boolean;

  @state active: boolean;
  @property value?: any;
  @property quickRanges?: { label: string; value: any }[];
  @globalemitter change: Emitter<any | number[]>;
  @emitter clear: Emitter;

  constructor() {
    super();
    this.addEventListener('click', this.#onOpen);
    this.addEventListener('keydown', commonHandle);
    this.tabIndex = 0;
    this.internals.role = 'combobox';
  }

  #onClear = (e: Event) => {
    e.stopPropagation();
    this.clear(null);
  };

  #onOpen = () => {
    if (this.disabled) return;

    let v: undefined | number[] = undefined;
    const onChange = ({ detail, target }: CustomEvent<number[]>) => {
      const root = (target as HTMLElement).getRootNode() as ShadowRoot;
      const button = root.querySelector('dy-button') as DuoyunButtonElement;
      button.disabled = false;
      v = detail;
    };
    const onSubmit = () => {
      if (isNotNullish(v)) {
        this.change(v);
        ContextMenu.close();
      }
    };
    ContextMenu.open(
      html`
        <dy-date-range-panel @change=${onChange} ?time=${this.time} .value=${this.value}></dy-date-range-panel>
        <style>
          .footer {
            margin-block-start: 2em;
            display: flex;
            justify-content: space-between;
          }
          .quick {
            display: flex;
            align-items: center;
            gap: 0.5em;
          }
          .quick-item {
            cursor: pointer;
          }
        </style>
        <div class="footer">
          <div class="quick">
            ${this.quickRanges?.map(
              ({ label, value }) =>
                html`
                  <dy-action-text
                    class=${classMap({ 'quick-item': true })}
                    .active=${this.value === value}
                    @click=${() => this.change(value)}
                  >
                    ${label}
                  </dy-action-text>
                `,
            )}
          </div>
          <dy-button disabled @click=${onSubmit} small>${locale.ok}</dy-button>
        </div>
      `,
      {
        activeElement: this,
        width: '30em',
      },
    );
  };

  #getCurrentLabel = (value: any) => {
    if (Array.isArray(value)) {
      return this.value.map((t: number) => new Time(t).format('YYYY-MM-DD')).join(' ~ ');
    }
    if (this.quickRanges) {
      const range = this.quickRanges.find((e) => value === e.value);
      return range?.label;
    }
  };

  mounted = () => {
    return () => this.active && ContextMenu.close();
  };

  render = () => {
    return html`
      <div class=${classMap({ value: true, placeholder: !this.value })}>
        ${this.value ? this.#getCurrentLabel(this.value) : this.placeholder}
      </div>
      <div class=${classMap({ icon: true, clearable: this.clearable })}>
        <gem-use class="date" .element=${icons.date}></gem-use>
        <gem-use @click=${this.#onClear} class="close" .element=${icons.close}></gem-use>
      </div>
    `;
  };
}
