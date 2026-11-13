import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  attribute,
  boolattribute,
  connectStore,
  customElement,
  effect,
  globalemitter,
  mounted,
  numattribute,
  part,
  property,
  shadow,
} from '@mantou/gem/lib/decorators';
import { createRef, css, GemElement, html } from '@mantou/gem/lib/element';
import { classMap } from '@mantou/gem/lib/utils';

import { commonHandle } from '../lib/hotkeys';
import { icons } from '../lib/icons';
import { locale } from '../lib/locale';
import { focusStyle } from '../lib/styles';
import { theme } from '../lib/theme';
import { Time } from '../lib/time';

import './use';

export type DatePickerType = 'date' | 'time' | 'datetime' | 'month';

const nativeTypes: Record<DatePickerType, string> = {
  date: 'date',
  time: 'time',
  datetime: 'datetime-local',
  month: 'month',
};

// 原生值不带时区，按本地时间解析
const parsers: Record<DatePickerType, (value: string) => Time> = {
  date: (value) => new Time(`${value}T00:00`),
  time: (value) => new Time(`1970-01-01T${value}`),
  datetime: (value) => new Time(value),
  month: (value) => new Time(`${value}-01T00:00`),
};

const formatOptions: Record<DatePickerType, (value: string) => Intl.DateTimeFormatOptions> = {
  date: () => ({ dateStyle: 'medium' }),
  time: (value) => ({ timeStyle: value.length > 5 ? 'medium' : 'short' }),
  datetime: (value) => ({ dateStyle: 'medium', timeStyle: value.length > 16 ? 'medium' : 'short' }),
  month: () => ({ year: 'numeric', month: 'long' }),
};

const style = css`
  :host(:where(:not([hidden]))) {
    font-size: 0.875em;
    inline-size: 15em;
    block-size: 2.5rem;
    position: relative;
    display: inline-flex;
    align-items: center;
    line-height: 1;
    background-color: transparent;
    box-sizing: border-box;
    border: 1px solid ${theme.borderColor};
    border-radius: ${theme.normalRound};
    outline: none;
    overflow: hidden;
  }
  :host(:not([disabled])) {
    box-shadow: ${theme.controlShadow};
  }
  :host(:where(:focus-within, :hover)) {
    border-color: ${theme.primaryColor};
  }
  :host([disabled]) {
    cursor: not-allowed;
    border-color: transparent;
    background: ${theme.disabledColor};
  }
  .input {
    /* 透明覆盖整个元素，点击直接打开原生选择器 */
    position: absolute;
    inset: 0;
    inline-size: 100%;
    block-size: 100%;
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    border: none;
    opacity: 0;
    cursor: inherit;
    -webkit-appearance: none;
    appearance: none;
  }
  .input::-webkit-calendar-picker-indicator {
    position: absolute;
    inset: 0;
    inline-size: auto;
    block-size: auto;
    cursor: inherit;
  }
  .icon,
  .indicator,
  .clear {
    inline-size: 1.25em;
    flex-shrink: 0;
  }
  .icon {
    margin-inline-start: 0.5em;
  }
  .icon,
  .text,
  .indicator {
    pointer-events: none;
  }
  .text {
    flex-grow: 1;
    padding-inline: 0.5em;
    line-height: 1.5;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .text.placeholder {
    color: ${theme.describeColor};
  }
  .indicator,
  .clear {
    margin-inline-end: 0.4em;
  }
  .indicator {
    opacity: 0.5;
  }
  :host([disabled]) .indicator {
    opacity: 0.2;
  }
  .clear {
    position: relative;
    opacity: 0.2;
    transition: opacity 0.1s;
  }
  .clear:hover {
    opacity: 0.4;
  }
`;

/**
 * 包装原生日期/时间输入框，`value` 使用原生格式，例如 `2026-11-04`、`14:30`、`2026-11-04T14:30`、`2026-11`
 */
@customElement('tap-date-picker')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
@connectStore(locale)
@shadow({ delegatesFocus: true })
export class TapDatePickerElement extends GemElement {
  @part static text: string;
  @part static icon: string;
  @part static indicator: string;
  @part static clear: string;

  @globalemitter change: Emitter<string>;

  @attribute name: string;
  @attribute value: string;
  @attribute type: DatePickerType;
  @attribute placeholder: string;
  @attribute min: string;
  @attribute max: string;
  /**单位：`time`/`datetime` 为秒，`date` 为天，`month` 为月 */
  @numattribute step: number;
  @boolattribute required: boolean;
  @boolattribute disabled: boolean;
  @boolattribute autofocus: boolean;
  @boolattribute clearable: boolean;

  @property icon?: string | Element | DocumentFragment;

  #inputRef = createRef<HTMLInputElement>();

  get #type() {
    return this.type || 'date';
  }

  get #text() {
    if (!this.value) return this.placeholder;
    return parsers[this.#type](this.value).format(formatOptions[this.#type](this.value));
  }

  @mounted()
  #autoFocus = () => this.autofocus && this.focus();

  @effect((i) => [i.value, i.type])
  #updateValue = () => {
    const { value: element } = this.#inputRef;
    if (!element) return;
    element.value = this.value;
  };

  #onChange = (evt: Event) => {
    evt.stopPropagation();
    const { value: element } = this.#inputRef;
    if (!element) return;
    this.change(element.value);
    // 受控：外部未更新 `value` 时恢复原值
    element.value = this.value;
  };

  #onClear = (evt: Event) => {
    evt.stopPropagation();
    this.change('');
  };

  render = () => {
    return html`
      <input
        ${this.#inputRef}
        class="input"
        type=${nativeTypes[this.#type]}
        name=${this.name}
        min=${this.min}
        max=${this.max}
        step=${this.step || null}
        ?autofocus=${this.autofocus}
        ?required=${this.required}
        ?disabled=${this.disabled}
        @change=${this.#onChange}
      />
      <tap-use
        v-if=${!!this.icon}
        part=${TapDatePickerElement.icon}
        class="icon"
        .element=${this.icon}
      ></tap-use>
      <span
        part=${TapDatePickerElement.text}
        class=${classMap({ text: true, placeholder: !this.value })}
      >${this.#text}</span>
      <tap-use
        v-if=${this.clearable && !this.disabled && !!this.value}
        role="button"
        tabindex="0"
        @keydown=${commonHandle}
        @click=${this.#onClear}
        part=${TapDatePickerElement.clear}
        class="clear"
        .element=${icons.close}
      ></tap-use>
      <tap-use
        v-else
        part=${TapDatePickerElement.indicator}
        class="indicator"
        .element=${this.#type === 'time' ? icons.schedule : icons.date}
      ></tap-use>
    `;
  };
}
