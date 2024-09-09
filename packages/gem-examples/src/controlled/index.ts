import type { Emitter } from '@mantou/gem';
import {
  html,
  customElement,
  GemElement,
  render,
  attribute,
  emitter,
  createRef,
  createState,
  effect,
} from '@mantou/gem';

import '../elements/layout';

@customElement('app-form-text')
export class FormText extends GemElement {
  @attribute value: string;
  @emitter change: Emitter<string>;

  #inputRef = createRef<HTMLInputElement>();

  #nextState = {
    value: '',
    selectionStart: 0,
    selectionEnd: 0,
  };

  #inputHandle = (e: InputEvent) => {
    if (!e.isComposing) {
      const { element } = this.#inputRef;
      if (!element) return;
      const { value, selectionStart, selectionEnd } = element;
      this.#nextState = {
        value,
        selectionStart: selectionStart || 0,
        selectionEnd: selectionEnd || 0,
      };
      element.value = this.value;
      this.change(value);
    }
  };

  @effect((i) => [i.value])
  #init = () => {
    const { element } = this.#inputRef;
    if (!element) return;
    if (this.value === this.#nextState.value) {
      element.value = this.#nextState.value;
      element.selectionStart = this.#nextState.selectionStart;
      element.selectionEnd = this.#nextState.selectionEnd;
    } else {
      element.value = this.value;
    }
  };

  render() {
    return html`<input ref=${this.#inputRef.ref} @input=${this.#inputHandle} />`;
  }
}

@customElement('app-root')
export class Root extends GemElement {
  #state = createState({ value: '' });

  #changeHandle = (e: CustomEvent<string>) => this.#state({ value: e.detail });

  render() {
    return html`
      Controlled input:
      <app-form-text @change=${this.#changeHandle} value=${this.#state.value}></app-form-text>
    `;
  }
}

render(
  html`
    <gem-examples-layout>
      <app-root></app-root>
    </gem-examples-layout>
  `,
  document.body,
);
