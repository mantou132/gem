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
} from '@mantou/gem/lib/decorators';
import { GemElement, html, TemplateResult } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';
import { icons } from '../lib/icons';
import { focusStyle } from '../lib/styles';
import { commonHandle } from '../lib/hotkeys';

import './use';

type DataListItem = { label: string | TemplateResult; value?: any };
export type DataList = DataListItem[];

const style = createCSSSheet(css`
  :host {
    font-size: 0.875em;
    width: 15em;
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
    line-height: 1.5;
    color: inherit;
    width: 100%;
    padding-inline: 0.5em;
    border: none;
    background-color: transparent;
    resize: none;
  }
  .input::-webkit-calendar-picker-indicator,
  .input::-webkit-search-cancel-button {
    display: none !important;
  }
  .icon,
  .clear {
    width: 1.25em;
    flex-shrink: 0;
  }
  .icon {
    margin-left: 0.5em;
  }
  .clear {
    opacity: 0.2;
    padding-inline: 0.35em;
    margin-inline-start: -0.35em;
  }
  :host(:where(:not(:focus-within, :hover))) .clear {
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
 * @attr value
 * @attr type
 * @attr disabled
 * @attr autofocus
 * @attr rows
 * @attr step
 * @attr min
 * @attr max
 */
@customElement('dy-input')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
export class DuoyunInputElement extends GemElement {
  @refobject inputRef: RefObject<HTMLInputElement>;
  @globalemitter change: Emitter<string>;
  @emitter clear: Emitter<string>;

  @attribute value: string;
  @attribute type: 'search' | 'password' | 'email' | 'url' | 'tel' | 'text' | 'textarea' | 'number';
  @attribute placeholder: string;
  @boolattribute spellcheck: boolean;
  @boolattribute required: boolean;
  @boolattribute disabled: boolean;
  @boolattribute autofocus: boolean;
  @boolattribute clearable: boolean;
  @numattribute rows: number;
  @numattribute step: number;
  @numattribute min: number;
  @numattribute max: number;

  @property dataList?: DataList;
  @property icon?: string | Element | DocumentFragment;

  @state filled: boolean;

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

  #isComposing = false;

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
    if (!this.#isComposing) {
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
      setTimeout(() => (this.#editing = false));
    }
  };

  #compositionstartHandle = () => {
    this.#isComposing = true;
  };

  #compositionendHandle = () => {
    // https://bugs.chromium.org/p/chromium/issues/detail?id=1263817
    this.#isComposing = false;
    this.#inputHandle();
  };

  #onClear = (evt: Event) => {
    evt.stopPropagation();
    this.clear('');
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
              part="input"
              spellcheck=${this.#spellcheck}
              placeholder=${this.placeholder}
              ?disabled=${this.disabled}
              rows=${this.#rows}
              ?required=${this.required}
              @input=${this.#inputHandle}
              @compositionstart=${this.#compositionstartHandle}
              @compositionend=${this.#compositionendHandle}
            ></textarea>
          `
        : html`
            <input
              ref=${this.inputRef.ref}
              type=${this.#type}
              ?disabled=${this.disabled}
              class="input"
              part="input"
              spellcheck=${this.#spellcheck}
              list="datalist"
              step=${this.#step}
              min=${this.#min}
              max=${this.#max}
              placeholder=${this.placeholder}
              ?required=${this.required}
              @input=${this.#inputHandle}
              @compositionstart=${this.#compositionstartHandle}
              @compositionend=${this.#compositionendHandle}
            />
          `}
      ${this.dataList &&
      html`
        <datalist id="datalist">
          ${this.dataList.map(({ value, label }) => html`<option value=${value ?? label}>${label}</option>`)}
        </datalist>
      `}
      ${this.clearable && this.value
        ? html`
            <dy-use
              tabindex="0"
              role="button"
              @keydown=${commonHandle}
              @click=${this.#onClear}
              part="clear"
              class="clear"
              .element=${icons.close}
            ></dy-use>
          `
        : ''}
    `;
  }

  focus = () => {
    this.inputRef.element?.focus();
  };

  blur = () => {
    if (this.shadowRoot!.activeElement instanceof HTMLElement) {
      this.shadowRoot!.activeElement.blur();
    }
  };
}

const inputGroupStyle = createCSSSheet(css`
  dy-input-group {
    display: flex;
  }
  dy-input-group :where(dy-input, dy-select):where(:focus, :focus-within, :hover, :--active, [data-active]) {
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
