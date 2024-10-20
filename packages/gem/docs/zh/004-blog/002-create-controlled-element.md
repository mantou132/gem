# 创建受控元素

在 React 中，表单元素默认是[受控](https://reactjs.org/docs/forms.html#controlled-components)的，需要使用组件传递数据给表单元素以修改表单元素的值，这有许多的好处：

- 单一数据来源
- 渲染前处理用户输入

Gem 默认没有处理此行为，你可以像 Vanilla JS 一样处理表单：

```ts
@customElement('form-text')
class FormTextElement extends GemElement {
  #inputRef = createRef<HTMLInputElement>();

  render() {
    return html`<input ${this.#inputRef} value="defaultValue" />`;
  }

  submit() {
    return fetch('/', { body: this.#inputRef.value!.value });
  }
}
```

你可以利用 [`input` 事件](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/input_event) 自行创建受控表单元素：

1. 监听 `input` 事件，储存新值

   ```ts
   @customElement('form-text')
   export class FormTextElement extends GemElement {
     #inputRef = createRef<HTMLInputElement>();

     #nextState = '';

     #inputHandle = (e: InputEvent) => {
       this.#nextState = this.#inputRef.value!.value;
     };

     render() {
       return html`<input ${this.#inputRef} @input=${this.#inputHandle} />`;
     }
   }
   ```

2. 还原旧值并触发自定义 `change` 事件

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

     render() {
       return html`<input ${this.#inputRef} @input=${this.#inputHandle} />`;
     }
   }
   ```

3. 根据属性修改 `<input>` 元素值

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

     render() {
       return html`<input ${this.#inputRef} @input=${this.#inputHandle} />`;
     }
   }
   ```

现在 `<form-text>` 就是一个受控元素，它只接收 `value` 属性的值：

```ts
@customElement('form')
class FormElement extends GemElement {
  #state = createState({
    value: '',
  });

  #changeHandle = ({ detail }) => this.#state({ value: detail });

  render() {
    return html`<form-text value=${this.#state.value} @change=${this.#changeHandle}></form-text>`;
  }

  submit = () => {
    fetch('/', { body: this.#state.value });
  };
}
```

最后，你可能需要利用 [`selectionStart`/`selectionEnd`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement) 处理指针位置、[`isComposing`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/isComposing) 处理输入法候选。
