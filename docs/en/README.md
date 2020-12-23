---
title: Use Web Components to quickly build complex high-performance WebApps
hero:
  title: Gem
  desc: Use Web Components to quickly build complex high-performance WebApps
  actions:
    - text: Getting Started
      link: ./001-guide/
features:
  - title: Web Components
    desc: >
      Build encapsulated elements that manage their own state, and then combine them to form a complex WebApp.


      Use the familiar ES Classes syntax to write custom elements and declare the data and attributes of the custom elements.

  - title: Declarative
    desc: >
      GemElement’s simple, familiar development model makes it easier than ever to build Web Components.


      Express your UI declaratively, as a function of state. No need to learn a custom templating language – you can use the full power of JavaScript in your templates. Elements update automatically when their properties change.

  - title: Observation
    desc: >
      The management of global data and the modification of routing all use the observation mode.


      Use the observation mode to connect custom elements and data, and efficiently update your WebApp when data is updated, you only need to focus on business logic.
---

## TodoApp

```ts
import { customElement, GemElement, html, render, createStore, connectStore, updateStore } from '@mantou/gem';

const todoData = createStore<{ items: string[] }>({
  items: [],
});

const addItemAction = (item: string) => {
  updateStore(todoData, { items: [...todoData.items, item] });
};

@customElement('todo-list')
@connectStore(todoData)
export class TodoListElement extends GemElement {
  render = () => {
    return html`
      <ul>
        ${todoData.items.map((item) => html`<li>${item}</li>`)}
      </ul>
    `;
  };
}

@customElement('todo-root')
export class TodoRootElement extends GemElement {
  #inputValue = '';

  #onInput = (e: InputEvent) => {
    this.#inputValue = (e.target as HTMLInputElement).value;
  };

  #onSubmit = (e: Event) => {
    e.preventDefault();
    addItemAction(this.#inputValue);
  };

  render = () => {
    return html`
      <div>
        <h3>TODO</h3>
        <todo-list></todo-list>
        <form @submit=${this.#onSubmit}>
          <label for="new-todo"> What needs to be done? </label>
          <input id="new-todo" @input=${this.#onInput} />
          <button>Add #${todoData.items.length + 1}</button>
        </form>
      </div>
    `;
  };
}

render(html`<todo-root></todo-root>`, document.querySelector('#root') as Element);
```

[![Edit on CodeSandbox](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/todoapp-cxsdv)
