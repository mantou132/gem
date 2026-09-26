import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  aria,
  attribute,
  boolattribute,
  customElement,
  emitter,
  globalemitter,
  memo,
  mounted,
  numattribute,
  part,
  shadow,
} from '@mantou/gem/lib/decorators';
import { createRef, createState, css, GemElement, html, type TemplateResult } from '@mantou/gem/lib/element';
import { classMap, partMap } from '@mantou/gem/lib/utils';

import { focusStyle } from '../lib/styles';
import { theme } from '../lib/theme';

const style = css`
  :host(:where(:not([hidden]))) {
    display: inline-flex;
    align-items: center;
    position: relative;
    box-sizing: border-box;
    font-size: 1.25em;
    line-height: 1;
    user-select: none;
    -webkit-user-select: none;
    cursor: text;
    --gap: 0.5em;
    --cell-size: 2.4em;
    --border-radius: ${theme.normalRound};
    --border-color: ${theme.borderColor};
    --focus-border-color: ${theme.primaryColor};
    --cell-bg: ${theme.backgroundColor};
  }

  :host([disabled]) {
    cursor: not-allowed;
    opacity: 0.6;
  }

  :host([readonly]) {
    cursor: default;
  }

  :host([error]) {
    --border-color: ${theme.negativeColor};
    --focus-border-color: ${theme.negativeColor};
    color: ${theme.negativeColor};
  }

  :host([variant='joint']) {
    .container {
      gap: 0;
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      overflow: hidden;
      box-shadow: ${theme.controlShadow};
    }

    &:focus-within:not([disabled], [readonly]) .container {
      border-color: var(--focus-border-color);
    }

    .cell {
      border: none;
      border-radius: 0;
      box-shadow: none;
      border-inline-end: 1px solid var(--border-color);

      &:last-child {
        border-inline-end: none;
      }

      &.active {
        background: color-mix(in srgb, var(--focus-border-color) 8%, var(--cell-bg));
      }
    }
  }

  :host([variant='underline']) {
    .cell {
      border: none;
      border-bottom: 2px solid var(--border-color);
      border-radius: 0;
      background: transparent;
      box-shadow: none;

      &.active {
        border-bottom-color: var(--focus-border-color);
      }
    }
  }

  :host(:not([variant])),
  :host([variant='box']) {
    .cell.active {
      border-color: var(--focus-border-color);
      box-shadow: 0 0 0 1px var(--focus-border-color);
    }
  }

  .input {
    position: absolute;
    inset: 0;
    inline-size: 100%;
    block-size: 100%;
    opacity: 0;
    pointer-events: auto;
    cursor: inherit;
    border: none;
    padding: 0;
    margin: 0;
    z-index: 1;
  }

  .container {
    display: inline-flex;
    align-items: center;
    gap: var(--gap);
  }

  .cell {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    inline-size: var(--cell-size);
    block-size: var(--cell-size);
    font-size: 1em;
    font-weight: bold;
    box-sizing: border-box;
    background: var(--cell-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    box-shadow: ${theme.controlShadow};
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .dot {
    inline-size: 0.5em;
    block-size: 0.5em;
    border-radius: 50%;
    background-color: currentColor;
  }

  .placeholder {
    color: ${theme.describeColor};
    font-weight: normal;
    opacity: 0.5;
  }

  .caret {
    position: absolute;
    inline-size: 2px;
    block-size: 1.2em;
    background-color: var(--focus-border-color);
    border-radius: 1px;
    animation: blink 1s step-end infinite;
  }

  @keyframes blink {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0;
    }
  }
`;

@customElement('tap-pin-code')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
@shadow({ delegatesFocus: true })
@aria({ role: 'group' })
export class TapPinCodeElement extends GemElement {
  @part static cell: string;
  @part static activeCell: string;
  @part static input: string;
  @part static dot: string;
  @part static caret: string;

  @globalemitter change: Emitter<string>;
  @emitter submit: Emitter<string>;

  @attribute value: string;
  @attribute type: 'number' | 'alphanumeric' | 'text';
  @attribute variant: 'box' | 'underline' | 'joint';
  @attribute mask: string;
  @attribute placeholder: string;

  @numattribute length: number;
  @boolattribute autofocus: boolean;
  @boolattribute disabled: boolean;
  @boolattribute readonly: boolean;
  @boolattribute error: boolean;
  @boolattribute disableAutocommit: boolean;

  #inputRef = createRef<HTMLInputElement>();
  #state = createState({ value: '', focus: false });

  get #length() {
    return this.length || 6;
  }

  get #type() {
    return this.type || 'number';
  }

  get #isMasked() {
    return this.attributes.mask !== undefined || !!this.mask;
  }

  get #maskChar() {
    if (!this.#isMasked) return '';
    return this.mask && this.mask !== 'true'
      ? this.mask
      : html`<span class="dot" part=${TapPinCodeElement.dot}></span>`;
  }

  #sanitize = (val: string) => {
    let result = val;
    if (this.#type === 'number') {
      result = result.replace(/\D/g, '');
    } else if (this.#type === 'alphanumeric') {
      result = result.replace(/[^a-zA-Z0-9]/g, '');
    }
    return result.slice(0, this.#length);
  };

  @memo((i) => [i.value])
  #syncValue = () => {
    this.#state({ value: this.#sanitize(this.value) });
  };

  #onInput = (evt: Event) => {
    const input = evt.target as HTMLInputElement;
    const newValue = this.#sanitize(input.value);
    const { value: oldValue } = this.#state;
    input.value = oldValue;
    if (newValue !== oldValue) {
      this.change(newValue);
      if (!this.disableAutocommit && newValue.length === this.#length) {
        this.submit(newValue);
      }
    }
  };

  #onFocus = () => {
    this.#state({focus:true})
    const input = this.#inputRef.value;
    if (input) {
      const len = input.value.length;
      input.setSelectionRange(len, len);
    }
  };

  #onBlur = () => {

    this.#state({focus:false})
  }

  @mounted()
  #autoFocus = () => this.autofocus && this.focus();

  render = () => {
    const { value , focus} = this.#state;
    const activeIndex = Math.min(value.length, this.#length - 1);

    return html`
      <input
        ${this.#inputRef}
        class="input"
        part=${TapPinCodeElement.input}
        type=${this.#isMasked ? 'password' : 'text'}
        inputmode=${this.#type === 'number' ? 'numeric' : 'text'}
        pattern=${this.#type === 'number' ? '[0-9]*' : undefined}
        autocomplete="one-time-code"
        maxlength=${this.#length}
        .value=${value}
        ?disabled=${this.disabled}
        ?readonly=${this.readonly}
        @input=${this.#onInput}
        @focus=${this.#onFocus}
        @blur=${this.#onBlur}
        @click=${this.#onFocus}
      />
      <div class="container">
        ${Array.from({ length: this.#length }).map((_, index) => {
          const char = value[index];
          const isFilled = char !== undefined;
          const isFocusable = !this.readonly && !this.disabled  && focus;
          const isActive = isFocusable && (value.length < this.#length ? index === value.length : index === activeIndex);
          const showCaret = isFocusable && !isFilled && index === value.length;

          let content: string | TemplateResult = '';
          if (isFilled) {
            if (this.#isMasked) {
              content = this.#maskChar;
            } else {
              content = char;
            }
          } else if (this.placeholder) {
            content = html`<span class="placeholder">${this.placeholder}</span>`;
          }

          return html`
            <div
              class=${classMap({ cell: true, active: isActive, filled: isFilled })}
              part=${partMap({
                [TapPinCodeElement.cell]: true,
                [TapPinCodeElement.activeCell]: isActive,
              })}
            >
              <span v-if=${showCaret} class="caret" part=${TapPinCodeElement.caret}></span>
              ${content}
            </div>
          `;
        })}
      </div>
    `;
  };

  focus(options?: FocusOptions) {
    this.#inputRef.value?.focus(options);
  }

  blur() {
    this.#inputRef.value?.blur();
  }

  clear() {
    this.change('');
  }
}
