import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  aria,
  attribute,
  boolattribute,
  connectStore,
  customElement,
  emitter,
  globalemitter,
  part,
  shadow,
  state,
} from '@mantou/gem/lib/decorators';
import { createRef, css, GemElement, html } from '@mantou/gem/lib/element';

import { icons } from '../lib/icons';
import { locale } from '../lib/locale';
import { theme } from '../lib/theme';
import type { TapInputElement } from './input';

import './input';

const style = css`
  :host(:where(:not([hidden]))) {
    display: flex;
    align-items: center;
    box-sizing: border-box;
    width: 100%;
    min-height: 3.25em;
    padding: 0.5em 1em;
    background: ${theme.lightBackgroundColor};
    color: ${theme.textColor};
  }
  .input {
    flex: 1;
    width: 0;
    border-radius: calc(${theme.normalRound} * 2);
    background: ${theme.backgroundColor};
  }
  .cancel {
    flex: 0 0 auto;
    max-width: 0;
    overflow: hidden;
    padding: 0;
    border: 0;
    background: transparent;
    color: ${theme.primaryColor};
    font: inherit;
    white-space: nowrap;
    cursor: pointer;
    opacity: 0;
    transition: all 180ms ${theme.timingFunction};
    -webkit-tap-highlight-color: transparent;
  }
  .cancel.visible {
    margin-inline-start: 0.65em;
    max-width: 8em;
    opacity: 1;
  }
  .cancel:disabled {
    cursor: not-allowed;
    opacity: 0.4;
  }
`;

@customElement('tap-searchbar')
@adoptedStyle(style)
@connectStore(locale)
@aria({ role: 'search' })
@shadow()
export class TapSearchbarElement extends GemElement {
  @part static input: string;
  @part static cancel: string;

  @attribute value: string;
  @attribute placeholder: string;
  @attribute cancelText: string;
  @boolattribute autofocus: boolean;
  @boolattribute disabled: boolean;
  @boolattribute disableCancel: boolean;

  @globalemitter change: Emitter<string>;
  @emitter search: Emitter<string>;
  @emitter submit: Emitter<string>;
  @emitter cancel: Emitter;

  @state active: boolean;

  #inputRef = createRef<TapInputElement>();

  focus = (options?: FocusOptions) => this.#inputRef.value?.focus(options);
  blur = () => this.#inputRef.value?.blur();

  #updateValue = (value: string) => {
    this.change(value);
    this.search(value);
  };

  #onChange = (evt: CustomEvent<string>) => {
    evt.stopPropagation();
    this.#updateValue(evt.detail);
  };

  #onClear = () => this.#updateValue('');

  #onCancel = () => {
    this.#updateValue('');
    this.cancel(null);
    this.blur();
  };

  #onKeyDown = (evt: KeyboardEvent) => {
    if (evt.key !== 'Enter' || evt.isComposing) return;
    evt.preventDefault();
    this.submit(this.value || '');
  };

  render = () => {
    const showCancel = !this.disableCancel && (this.active || !!this.value);
    return html`
      <tap-input
        ${this.#inputRef}
        class="input"
        part=${TapSearchbarElement.input}
        type="search"
        .value=${this.value || ''}
        .icon=${icons.search}
        placeholder=${this.placeholder || locale.search}
        ?autofocus=${this.autofocus}
        ?disabled=${this.disabled}
        clearable
        @change=${this.#onChange}
        @clear=${this.#onClear}
        @focusin=${() => (this.active = true)}
        @focusout=${() => (this.active = false)}
        @keydown=${this.#onKeyDown}
      ></tap-input>
      <button
        type="button"
        class=${showCancel ? 'cancel visible' : 'cancel'}
        part=${TapSearchbarElement.cancel}
        tabindex=${showCancel ? 0 : -1}
        ?disabled=${this.disabled}
        @pointerdown=${(evt: PointerEvent) => evt.preventDefault()}
        @click=${this.#onCancel}
      >
        ${this.cancelText || locale.cancel}
      </button>
    `;
  };
}
