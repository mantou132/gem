# 创建受控元素

> 推荐使用 TypeScript 来编写，本文的示例也使用 TypeScript

在 React 中，表单元素默认是[受控](https://reactjs.org/docs/forms.html#controlled-components)的，需要使用组件传递数据给表单元素以修改表单元素的值，这有许多的好处：

- 单一数据来源
- 渲染前处理用户输入

Gem 默认没有处理此行为，你可以像 Vanilla JS 一样处理表单：

```ts
@customElement('form-text')
class FormTextElement extends GemElement {
  @refobject inputRef: RefObject<HTMLInputElement>;

  submit() {
    return fetch('/', { body: this.inputRef.element!.value });
  }

  render() {
    return html`<input ref=${this.inputRef.ref} value="defaultValue" />`;
  }
}
```

你可以利用 [`input` 事件](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/input_event) 自行创建受控表单元素：

1. 监听 `input` 事件，储存新值

   ```ts
   @customElement('form-text')
   export class FormTextElement extends GemElement {
     @refobject inputRef: RefObject<HTMLInputElement>;

     #nextState = '';

     #inputHandle = (e: InputEvent) => {
       this.#nextState = this.inputRef.element!.value;
     };

     render() {
       return html`<input ref=${this.inputRef.ref} @input=${this.#inputHandle} />`;
     }
   }
   ```

2. 还原旧值并触发自定义 `change` 事件

   ```ts 5,11-12
   @customElement('form-text')
   export class FormTextElement extends GemElement {
     @refobject inputRef: RefObject<HTMLInputElement>;
     @attribute value: string;
     @emitter change: Emitter<string>;

     #nextState = '';

     #inputHandle = (e: InputEvent) => {
       this.#nextState = this.inputRef.element!.value;
       this.inputRef.element!.value = this.value;
       this.change(value);
     };

     render() {
       return html`<input ref=${this.inputRef.ref} @input=${this.#inputHandle} />`;
     }
   }
   ```

3. 根据属性修改 `<input>` 元素值

   ```ts 20-30
   @customElement('form-text')
   export class FormTextElement extends GemElement {
     @refobject inputRef: RefObject<HTMLInputElement>;
     @attribute value: string;
     @emitter change: Emitter<string>;

     #nextState = '';

     #inputHandle = (e: InputEvent) => {
       this.#nextState = this.inputRef.element!.value;
       this.inputRef.element!.value = this.value;
       this.change(value);
     };

     render() {
       return html`<input ref=${this.inputRef.ref} @input=${this.#inputHandle} />`;
     }

     mounted() {
       this.effect(
         () => {
           if (this.value === this.nextState.value) {
             this.inputRef.element!.value = this.nextState.value;
           } else {
             this.inputRef.element!.value = this.value;
           }
         },
         () => [this.value],
       );
     }
   }
   ```

现在 `<form-text>` 就是一个受控元素，它只接收 `value` 属性的值：

```ts
@customElement('form')
class FormElement extends GemElement {
  state = {
    value: '',
  };

  submit = () => fetch('/', { body: this.state.value });

  #changeHandle = ({ detail }) => this.setState({ value: detail });

  render() {
    return html`<form-text value=${this.state.value} @change=${this.#changeHandle}></form-text>`;
  }
}
```

最后，你可能需要利用 [`selectionStart`/`selectionEnd`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement) 处理指针位置、[`isComposing`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/isComposing) 处理输入法候选。
