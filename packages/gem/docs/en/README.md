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


      Express your UI declaratively, as a function of state. No need to learn a custom template language – you can use the full power of JavaScript in your templates. Elements update automatically when their properties change.

  - title: Observation
    desc: >
      The management of global data and the modification of routing all use the observation mode.


      Use the observation mode to connect custom elements and data, and efficiently update your WebApp when data is updated, you only need to focus on business logic.
---

## TodoApp

<style>
[part=main] {
  width: clamp(100%, 90vw, 1024px);
  margin-left: calc((clamp(100%, 90vw, 1024px) - 100%) / -2);
}
</style>

<gbp-sandpack dependencies="@mantou/gem, duoyun-ui">

```ts
import { customElement, GemElement, html, render, connectStore, createState } from '@mantou/gem';

import { todoData, addItem } from './store';

import 'duoyun-ui/elements/input';
import 'duoyun-ui/elements/button';
import 'duoyun-ui/elements/heading';
import './todo-list';

@customElement('app-root')
@connectStore(todoData)
export class AppRootElement extends GemElement {
  #state = createState({ input: '' });

  #onChange = (e: CustomEvent<string>) => {
    this.#state({ input: e.detail });
  };

  #onSubmit = () => {
    addItem(this.#state.input);
    this.#state({ input: '' });
  };

  render = () => {
    return html`
      <dy-heading>TODO LIST</dy-heading>
      <todo-list></todo-list>
      <dy-heading lv="3">What needs to be done?</dy-heading>
      <dy-input-group>
        <dy-input id="new-todo" @change=${this.#onChange} .value=${this.#state.input}></dy-input>
        <dy-button @click=${this.#onSubmit}>Add #${todoData.items.length + 1}</dy-button>
      </dy-input-group>
    `;
  };
}
```

```ts todo-list.ts
import {
  customElement,
  GemElement,
  html,
  render,
  connectStore,
  createCSSSheet,
  adoptedStyle,
} from '@mantou/gem';
import { icons } from 'duoyun-ui/lib/icons';

import { todoData, deleteItem } from './store';

import 'duoyun-ui/elements/use';

const style = createCSSSheet`
  ul {
    padding: 0;
  }
  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-top: 1px solid #eee;
  }
  li:last-child {
    border-bottom: 1px solid #eee;
  }
  li:not(:hover) dy-use {
    opacity: 0;
  }
  dy-use {
    width: 1.3em;
    padding: 4px;
  }
  dy-use:hover {
    background: #eee;
  }
`;

@customElement('todo-list')
@connectStore(todoData)
@adoptedStyle(style)
export class TodoListElement extends GemElement {
  render = () => {
    return html`
      <ul>
        ${todoData.items.map(
          (item) => html`
            <li>
              <span>${item}</span>
              <dy-use .element=${icons.close} @click=${() => deleteItem(item)}></dy-use>
            </li>
          `,
        )}
      </ul>
    `;
  };
}
```

```ts store.ts
import { createStore } from '@mantou/gem';

type Store = { items: string[] };

export const todoData = createStore<Store>({ items: [] });

export const addItem = (item: string) => {
  todoData({ items: [...todoData.items, item] });
};

export const deleteItem = (item: string) => {
  todoData({ items: todoData.items.filter((e) => e !== item) });
};
```

</gbp-sandpack>
