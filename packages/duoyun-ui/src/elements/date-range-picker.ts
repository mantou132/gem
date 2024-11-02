import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  customElement,
  attribute,
  emitter,
  globalemitter,
  property,
  boolattribute,
  state,
  aria,
  shadow,
  mounted,
} from '@mantou/gem/lib/decorators';
import { GemElement, html, css } from '@mantou/gem/lib/element';
import { classMap } from '@mantou/gem/lib/utils';

import { Time } from '../lib/time';
import { icons } from '../lib/icons';
import { theme } from '../lib/theme';
import { locale } from '../lib/locale';
import { isNotNullish } from '../lib/types';
import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';

import type { DuoyunButtonElement } from './button';
import type { DateRangeValue } from './date-range-panel';
import { ContextMenu } from './contextmenu';
import type { BasePickerElement } from './picker';
import { pickerStyle } from './picker';

import './use';
import './date-range-panel';
import './button';

const style = css`
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
`;

@customElement('dy-date-range-picker')
@adoptedStyle(style)
@adoptedStyle(pickerStyle)
@adoptedStyle(focusStyle)
@shadow()
@aria({ focusable: true, role: 'combobox' })
export class DuoyunDateRangePickerElement extends GemElement implements BasePickerElement {
  @attribute placeholder: string;
  @boolattribute clearable: boolean;
  @boolattribute disabled: boolean;

  @state active: boolean;
  @property value?: DateRangeValue;
  @property quickRanges?: { label: string; value: DateRangeValue }[];
  @globalemitter change: Emitter<DateRangeValue>;
  @emitter clear: Emitter;

  #onClear = (e: Event) => {
    e.stopPropagation();
    this.clear(null);
  };

  #onOpen = () => {
    if (this.disabled) return;

    let v: undefined | DateRangeValue = undefined;
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
    const onQuick = (value: DateRangeValue) => {
      this.change(value);
      ContextMenu.close();
    };
    ContextMenu.open(
      html`
        <dy-date-range-panel @change=${onChange} .value=${this.value}></dy-date-range-panel>
        <style>
          dy-date-range-panel {
            margin-inline: -0.4em;
          }
          dy-date-range-panel::part(panel) {
            border-radius: 0;
          }
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

  #getCurrentLabel = () => {
    if (Array.isArray(this.value)) {
      return this.value.map((t: number) => new Time(t).format('YYYY-MM-DD')).join(' ~ ');
    }
    if (this.quickRanges) {
      const range = this.quickRanges.find((e) => this.value === e.value);
      return range?.label;
    }
  };

  @mounted()
  #init = () => {
    this.addEventListener('click', this.#onOpen);
    this.addEventListener('keydown', commonHandle);
    return () => this.active && ContextMenu.close();
  };

  render = () => {
    return html`
      <div class=${classMap({ value: true, placeholder: !this.value })}>
        ${this.value ? this.#getCurrentLabel() : this.placeholder}
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
