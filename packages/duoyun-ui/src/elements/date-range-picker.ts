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
import { BasePickerElement, pickerStyle } from './picker';

import './use';
import './date-range-panel';
import './button';

const style = createCSSSheet(css`
  :host {
    width: 18em;
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
  .icon {
    display: flex;
  }
  .close,
  :host(:not([disabled])) .clearable:hover .date {
    display: none;
  }
  :host(:not([disabled])) .clearable:hover .close {
    display: inline-flex;
  }
`);

/**
 * @customElement dy-date-range-picker
 * @attr placeholder
 * @attr clearable
 * @attr disabled
 * @fires change
 * @fires clear
 */
@customElement('dy-date-range-picker')
@adoptedStyle(style)
@adoptedStyle(pickerStyle)
@adoptedStyle(focusStyle)
export class DuoyunDateRangePickElement extends GemElement implements BasePickerElement {
  @attribute placeholder: string;
  @boolattribute clearable: boolean;
  @boolattribute disabled: boolean;

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
    const onQuick = (value: any) => {
      this.change(value);
      ContextMenu.close();
    };
    ContextMenu.open(
      html`
        <dy-date-range-panel @change=${onChange} .value=${this.value}></dy-date-range-panel>
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
              ({ label, value }) => html`
                <dy-action-text
                  class=${classMap({ 'quick-item': true })}
                  .active=${this.value === value}
                  @click=${() => onQuick(value)}
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
        <dy-use class="date" .element=${icons.date}></dy-use>
        <dy-use @click=${this.#onClear} class="close" .element=${icons.close}></dy-use>
      </div>
    `;
  };

  showPicker() {
    this.#onOpen();
  }
}
