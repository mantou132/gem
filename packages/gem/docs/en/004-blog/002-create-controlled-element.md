# Create controlled elements

In React, form elements are [controlled](https://reactjs.org/docs/forms.html#controlled-components) by default, and components need to be used to pass data to form elements to modify the value of form elements. Many benefits:

- Single source of data
- Process user input before rendering

Gem does not handle this behavior by default, you can handle forms like Vanilla JS:

```ts
@customElement('form-text')
class FormTextElement extends GemElement {
  #inputRef = createRef<HTMLInputElement>();

  render = () => {
    return html`<input ${this.#inputRef} value="defaultValue" />`;
  }

  submit = () => {
    return fetch('/', { body: this.#inputRef.value!.value });
  }
}
```

You can use [`input` event](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/input_event) to create controlled form elements yourself:

1. Listen to the `input` event and store the new value

   ```ts
   @customElement('form-text')
   export class FormTextElement extends GemElement {
     #inputRef = createRef<HTMLInputElement>();

     #nextState = '';

     #inputHandle = (e: InputEvent) => {
       this.#nextState = this.#inputRef.value!.value;
     };

     render = () => {
       return html`<input ${this.#inputRef} @input=${this.#inputHandle} />`;
     }
   }
   ```

2. Restore the old value and trigger a custom `change` event

   ```ts 5,11-12
   @customElement('form-text')
   export class FormTextElement extends GemElement {
     #inputRef = createRef<HTMLInputElement>();
     @attribute value: string;
     @emitter change: Emitter<string>;

     #nextState = '';

     #inputHandle = (e: InputEvent) => {
       this.#nextState = this.#inputRef.value!.value;
       this.#inputRef.value!.value = this.value;
       this.change(value);
     };

     render = () => {
       return html`<input ${this.#inputRef} @input=${this.#inputHandle} />`;
     }
   }
   ```

3. Modify `<input>` element value according to attributes

   ```ts 15-22
   @customElement('form-text')
   export class FormTextElement extends GemElement {
     #inputRef = createRef<HTMLInputElement>();
     @attribute value: string;
     @emitter change: Emitter<string>;

     #nextState = '';

     #inputHandle = (e: InputEvent) => {
       this.#nextState = this.#inputRef.value!.value;
       this.#inputRef.value!.value = this.value;
       this.change(value);
     };

     @effect((i) => [i.value])
     #updateValue = () => {
       if (this.value === this.nextState.value) {
         this.#inputRef.value!.value = this.nextState.value;
       } else {
         this.#inputRef.value!.value = this.value;
       }
     };

     render = () => {
       return html`<input ${this.#inputRef} @input=${this.#inputHandle} />`;
     }
   }
   ```

Now `<form-text>` is a controlled element, it only receives the value of the `value` attribute:

```ts
@customElement('form')
class FormElement extends GemElement {
  #state = createState({
    value: '',
  });

  #changeHandle = ({ detail }) => this.#state({ value: detail });

  render = () => {
    return html`<form-text value=${this.#state.value} @change=${this.#changeHandle}></form-text>`;
  }

  submit = () => {
    fetch('/', { body: this.#state.value });
  };
}
```

Finally, you may need to use [`selectionStart`/`selectionEnd`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement) to handle the pointer position, [`isComposing`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/isComposing) Process input method candidates.
