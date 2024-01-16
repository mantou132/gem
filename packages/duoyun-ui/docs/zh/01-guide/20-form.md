# 高级表单

DuoyunUI 所有的表单元素均为“[受控](https://reactjs.org/docs/forms.html#controlled-components)”元素，在进行表单编辑时，你需要动态的给表单元素进行赋值，例如：

```ts
@customElement('my-ele')
export class MyEleElement extends GemElement {
  state = {
    name: '',
  };

  #onChange = (evt) => {
    this.setState(evt.detail);
  };

  render = () => {
    return html`
      <dy-form @change=${this.#onChange}>
        <dy-form-item name="name" .value=${this.state.name}></dy-form-item>
      </dy-form>
    `;
  };
}
```

## 表单验证

为字段添加 `required` 属性，并在提交时进行表单验证：

```ts 16,23
@customElement('my-ele')
export class MyEleElement extends GemElement {
  state = {
    name: '',
  };

  get #formEle() {
    return this.shadowRoot.querySelect('dy-form');
  }

  #onChange = (evt) => {
    this.setState(evt.detail);
  };

  #onSubmit = async () => {
    if (!(await this.#formEle.valid())) return;
    console.log('Submit!');
  };

  render = () => {
    return html`
      <dy-form @change=${this.#onChange}>
        <dy-form-item required name="name" .value=${this.state.name}></dy-form-item>
      </dy-form>
      <dy-button @click=${this.#onSubmit}></dy-button>
    `;
  };
}
```

使用自定义验证器：

```ts 16,26-30
@customElement('my-ele')
export class MyEleElement extends GemElement {
  state = {
    name: '',
  };

  get #formEle() {
    return this.shadowRoot.querySelect('dy-form');
  }

  #onChange = (evt) => {
    this.setState(evt.detail);
  };

  #onSubmit = async () => {
    if (!(await this.#formEle.valid())) return;
    console.log('Submit!');
  };

  render = () => {
    return html`
      <dy-form @change=${this.#onChange}>
        <dy-form-item
          .rules=${[
            {
              validator: async () => {
                if (!this.state.name) {
                  throw new Error('name is required');
                }
              },
            },
          ]}
          name="name"
          .value=${this.state.name}
        ></dy-form-item>
      </dy-form>
      <dy-button @click=${this.#onSubmit}></dy-button>
    `;
  };
}
```

## 自定义表单字段

`<dy-form-item>` 默认支持 `text`, `number`, `checkbox`, `picker`, `radio`, `select`, `textarea`，如果这些不能满足你的需求，你可以使用自己的元素，
只需要实现 `value` 属性和可冒泡 `change` 事件即可，然后你可以使用 [`<dy-form-item>`](../02-elements/form.md#dy-form-item-api) 的 `slot` 类型：

```ts 14-16
@customElement('my-ele')
export class MyEleElement extends GemElement {
  state = {
    name: '',
  };

  #onChange = (evt) => {
    this.setState(evt.detail);
  };

  render = () => {
    return html`
      <dy-form @change=${this.#onChange}>
        <dy-form-item name="name" type="slot" .value=${this.state.name}>
          <my-input></my-input>
        </dy-form-item>
      </dy-form>
    `;
  };
}
```

如果你不想编写自定义元素，也可能利用 DuoyunUI 现有表单元素组合来完成你的需求：

```ts 20-23
@customElement('my-ele')
export class MyEleElement extends GemElement {
  state = {
    name: '',
    type: '',
  };

  #onChangeName = ({ detail }) => {
    this.setState({ name: detail });
  };

  #onChangeType = ({ detail }) => {
    this.setState({ type: detail });
  };

  render = () => {
    return html`
      <dy-form>
        <dy-form-item
          .rules=${
            [
              /** support validtor */
            ]
          }
        >
          <dy-input-group>
            <dy-input .value=${this.state.name} @change=${this.#onChangeName}></dy-input>
            <dy-input .value=${this.state.type} @change=${this.#onChangeType}></dy-input>
          </dy-input-group>
        </dy-form-item>
      </dy-form>
    `;
  };
}
```
