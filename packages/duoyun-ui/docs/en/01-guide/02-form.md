# Advanced form

All form elements of DuoyunUI are "[Controlled](https://reactjs.org/docs/forms.html#controlled-components)" elements,
when forming a form editing, you need to dynamically assign a value, for example:

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

## Form validation

Add a `required` attribute for the field, and perform a form validation when submitted:

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

Use a custom validator:

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

## Custom form field

`<dy-form-item>` default support `text`, `number`, `checkbox`, `pick`, `radio`, `select`, `textarea`,
if them can't meet your needs, you can use your own elements,
just implement the `value` attributes and bubble `change` event, then you can use [`<dy-form-item>`](../02-elements/form.md#dy-form-item-api) `slot` type:

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

If you don't want to write a custom element, you may also use the DuoyunUI existing form element combination to complete your needs:

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
