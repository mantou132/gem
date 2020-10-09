import { html, customElement, GemElement, render, attribute, emitter, Emitter, refobject, RefObject } from '../../';

@customElement('app-form-text')
export class FormText extends GemElement {
  @refobject inputRef: RefObject<HTMLInputElement>;
  @attribute value: string;
  @emitter change: Emitter<string>;

  nextState = {
    value: '',
    selectionStart: 0,
    selectionEnd: 0,
  };

  mounted() {
    this.effect(
      () => {
        const { element } = this.inputRef;
        if (!element) return;
        if (this.value === this.nextState.value) {
          element.value = this.nextState.value;
          element.selectionStart = this.nextState.selectionStart;
          element.selectionEnd = this.nextState.selectionEnd;
        } else {
          element.value = this.value;
        }
      },
      () => [this.value],
    );
  }

  inputHandle = (e: InputEvent) => {
    if (!e.isComposing) {
      const { element } = this.inputRef;
      if (!element) return;
      const { value, selectionStart, selectionEnd } = element;
      this.nextState = {
        value,
        selectionStart: selectionStart || 0,
        selectionEnd: selectionEnd || 0,
      };
      element.value = this.value;
      this.change(value);
    }
  };

  render() {
    return html`
      <input ref=${this.inputRef.ref} @input=${this.inputHandle} />
    `;
  }
}

@customElement('app-root')
export class Root extends GemElement {
  state = { value: '' };

  changeHandle = (e: CustomEvent<string>) => this.setState({ value: e.detail });

  render() {
    return html`
      Controlled input:
      <app-form-text @change=${this.changeHandle} value=${this.state.value}></app-form-text>
    `;
  }
}

render(
  html`
    <app-root></app-root>
  `,
  document.body,
);
