import {
  adoptedStyle,
  customElement,
  attribute,
  emitter,
  globalemitter,
  Emitter,
  property,
  boolattribute,
  numattribute,
  refobject,
  RefObject,
  state,
  part,
} from '@mantou/gem/lib/decorators';
import { GemElement, html, TemplateResult } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';
import { icons } from '../lib/icons';
import { focusStyle } from '../lib/styles';
import { commonHandle, hotkeys } from '../lib/hotkeys';
import { clamp } from '../lib/number';
import { throttle } from '../lib/utils';

import './use';

type DataListItem = { label: string | TemplateResult; value?: any };
export type DataList = DataListItem[];

class InputHistory {
  current: number;
  values: string[];
  #input: DuoyunInputElement;

  constructor(input: DuoyunInputElement) {
    this.#input = input;
    this.current = 0;
    this.values = [''];
  }

  undo = () => {
    if (this.current > 0) {
      this.current--;
      this.#input.change(this.values[this.current]);
    }
  };

  redo = () => {
    if (this.current < this.values.length - 1) {
      this.current++;
      this.#input.change(this.values[this.current]);
    }
  };

  save = throttle(() => {
    const { value } = this.#input;
    if (value !== this.values[this.current]) {
      this.values = [...this.values.slice(0, this.current + 1), value];
      this.current++;
    }
  }, 300);
}

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    font-size: 0.875em;
    inline-size: 15em;
    position: relative;
    display: inline-flex;
    align-items: stretch;
    line-height: 1;
    background-color: transparent;
    box-sizing: border-box;
    border: 1px solid ${theme.borderColor};
    border-radius: ${theme.normalRound};
    outline: none;
  }
  :host(:not([type='textarea'])) {
    block-size: calc(2.2em + 2px);
  }
  :host(:where(:focus-within, :hover)) {
    border-color: ${theme.textColor};
  }
  :host([disabled]) {
    cursor: not-allowed;
    border-color: transparent;
    background: ${theme.disabledColor};
  }
  .input {
    outline: none;
    font: inherit;
    text-align: inherit;
    line-height: 1.5;
    color: inherit;
    inline-size: 100%;
    padding-inline: 0.5em;
    border: none;
    background-color: transparent;
    resize: none;
  }
  .input::-webkit-calendar-picker-indicator,
  .input::-webkit-search-decoration,
  .input::-webkit-search-cancel-button,
  .input::-webkit-search-results-button,
  .input::-webkit-search-results-decoration {
    display: none !important;
  }
  .icon,
  .clear {
    inline-size: 1.25em;
    flex-shrink: 0;
  }
  .icon {
    margin-inline-start: 0.5em;
  }
  .clear {
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
  .input::placeholder {
    color: ${theme.describeColor};
  }

  @media (hover: none) {
    .clear {
      display: block;
    }
  }
`);

/**
 * @customElement dy-input
 * @attr name
 * @attr value
 * @attr type
 * @attr placeholder
 * @attr disabled
 * @attr autofocus
 * @attr clearable
 * @attr alwayclearable
 * @attr rows
 * @attr step
 * @attr min
 * @attr max
 */
@customElement('dy-input')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
export class DuoyunInputElement extends GemElement {
  @part static input: string;
  @part static clear: string;

  @refobject inputRef: RefObject<HTMLInputElement>;
  @globalemitter change: Emitter<string>;
  @emitter clear: Emitter<string>;

  @attribute name: string;
  @attribute value: string;
  @attribute type: 'search' | 'password' | 'email' | 'url' | 'tel' | 'text' | 'textarea' | 'number';
  @attribute placeholder: string;
  @boolattribute spellcheck: boolean;
  @boolattribute required: boolean;
  @boolattribute disabled: boolean;
  @boolattribute autofocus: boolean;
  @boolattribute clearable: boolean;
  @boolattribute alwayclearable: boolean;
  @numattribute rows: number;
  @numattribute step: number;
  @numattribute min: number;
  @numattribute max: number;

  @property dataList?: DataList;
  @property icon?: string | Element | DocumentFragment;

  @state filled: boolean;
  @state composing: boolean;

  get #spellcheck() {
    return this.spellcheck ? 'true' : 'false';
  }

  get #type() {
    // https://html.spec.whatwg.org/multipage/input.html#do-not-apply
    return !this.type || this.type === 'number' ? 'text' : this.type;
  }

  get #isNumberType() {
    return this.type === 'number';
  }

  get #rows() {
    return this.rows || 5;
  }

  get #step() {
    return this.step || 1;
  }

  get #min() {
    return this.hasAttribute('min') ? this.min : -Infinity;
  }

  get #max() {
    return this.hasAttribute('max') ? this.max : Infinity;
  }

  constructor() {
    super({ delegatesFocus: true });
  }

  #nextState = {
    value: '',
    selectionStart: 0,
    selectionEnd: 0,
  };

  #isNumberNotChange = (value: string, nextValue: string) => {
    if (this.#isNumberType) {
      const isZero = value === '0' && nextValue === '';
      const isEqual = Number(value) === Number(nextValue);
      return isZero || isEqual;
    }
  };

  #isNumberInvalid = (value: string) => {
    if (this.#isNumberType) {
      return !/^-?(\.|\d)*$/.test(value) || value.replace(/\d/g, '').includes('..');
    }
  };

  #editing = false;

  #inputHandle = () => {
    if (!this.composing) {
      const { element } = this.inputRef;
      if (!element) return;
      const { value, selectionStart, selectionEnd } = element;
      // `value` mission `2.`?

      // number decimal point
      if (value === this.value) {
        return;
      }
      if (this.#isNumberNotChange(this.value, value)) {
        return;
      }
      if (this.#isNumberInvalid(value)) {
        element.value = this.value;
        return;
      }
      this.#nextState = {
        value,
        selectionStart: selectionStart || 0,
        selectionEnd: selectionEnd || 0,
      };
      element.value = this.value;
      this.change(value);
      this.#editing = true;
      setTimeout(() => {
        this.#editing = false;
        this.#history.save();
      });
    }
  };

  #compositionstartHandle = () => {
    this.composing = true;
  };

  #compositionendHandle = () => {
    // https://bugs.chromium.org/p/chromium/issues/detail?id=1263817
    this.composing = false;
    this.#inputHandle();
  };

  #onClear = async (evt: Event) => {
    evt.stopPropagation();
    this.clear('');
    this.#history.save();
    // click handle 之后会聚焦到 target 上
    await Promise.resolve();
    this.focus();
  };

  #history = new InputHistory(this);

  #onKeyDown = (evt: KeyboardEvent) => {
    const nextValue = (n: number) => String(clamp(this.#min, Number(this.value || this.min) + n, this.#max));
    hotkeys({
      esc: () => {
        // Chrome： 当在 search 输入框上 esc 时，会触发输入为 '' 的事件
        // 这里阻止默认行为
      },
    })(evt);
    if (this.type === 'number') {
      hotkeys(
        {
          up: () => this.change(nextValue(this.#step)),
          down: () => this.change(nextValue(-this.#step)),
        },
        { stopPropagation: true },
      )(evt);
    }
    hotkeys(
      {
        'ctrl+z,command+z': () => this.#history.undo(),
        'ctrl+shift+z,command+shift+z': () => this.#history.redo(),
      },
      { stopPropagation: true },
    )(evt);
  };

  mounted = () => {
    this.effect(
      () => {
        const { element } = this.inputRef;
        if (!element) return;
        const { value, selectionStart, selectionEnd } = this.#nextState;
        if (this.value === value) {
          Object.assign(element, { value, selectionStart, selectionEnd });
        } else {
          if (this.#editing && this.#isNumberNotChange(this.value, value)) {
            element.value = value;
          } else {
            element.value = this.value;
          }
        }
        this.filled = !!element.value;
      },
      () => [this.value],
    );
    this.autofocus && this.focus();
  };

  render() {
    return html`
      ${this.icon ? html`<dy-use class="icon" .element=${this.icon}></dy-use>` : ''}
      ${this.#type === 'textarea'
        ? html`
            <textarea
              ref=${this.inputRef.ref}
              class="input"
              part=${DuoyunInputElement.input}
              spellcheck=${this.#spellcheck}
              placeholder=${this.placeholder}
              ?disabled=${this.disabled}
              ?required=${this.required}
              @input=${this.#inputHandle}
              @compositionstart=${this.#compositionstartHandle}
              @compositionend=${this.#compositionendHandle}
              @keydown=${this.#onKeyDown}
              rows=${this.#rows}
            ></textarea>
          `
        : html`
            <input
              type=${this.#type}
              ref=${this.inputRef.ref}
              class="input"
              part=${DuoyunInputElement.input}
              spellcheck=${this.#spellcheck}
              name=${this.name}
              placeholder=${this.placeholder}
              ?disabled=${this.disabled}
              ?required=${this.required}
              @input=${this.#inputHandle}
              @compositionstart=${this.#compositionstartHandle}
              @compositionend=${this.#compositionendHandle}
              @keydown=${this.#onKeyDown}
              list="datalist"
            />
          `}
      ${this.dataList &&
      html`
        <datalist id="datalist">
          ${this.dataList.map(({ value, label }) => html`<option value=${value ?? label}>${label}</option>`)}
        </datalist>
      `}
      ${this.clearable && (this.alwayclearable || this.value)
        ? html`
            <dy-use
              role="button"
              tabindex=${-Number(this.disabled)}
              aria-disabled=${this.disabled}
              @keydown=${commonHandle}
              @click=${this.#onClear}
              part=${DuoyunInputElement.clear}
              class="clear"
              .element=${icons.close}
            ></dy-use>
          `
        : ''}
    `;
  }
}

const inputGroupStyle = createCSSSheet(css`
  dy-input-group {
    display: flex;
  }
  dy-input-group :where(dy-input, dy-select):where(:focus, :focus-within, :hover, [data-active], :state(active)) {
    position: relative;
    z-index: 1;
  }
  dy-input-group > * {
    flex-grow: 1;
  }
  dy-input-group > :not(:last-child) {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }
  dy-input-group > :nth-child(n + 2),
  /* dy-input-group > dy-tooltip > dy-button */
  dy-input-group > dy-tooltip:last-child > * {
    margin-inline-start: -1px;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }
`);

/**
 * @customElement dy-input-group
 */
@customElement('dy-input-group')
@adoptedStyle(inputGroupStyle)
export class DuoyunInputGroupElement extends GemElement {
  constructor() {
    super({ isLight: true });
    this.internals.role = 'group';
  }
}
