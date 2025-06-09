---
title: Quickly Build UI Components, High-Performance WebApps
hero:
  title: Gem
  desc: Quickly build UI components, high-performance WebApps
  actions:
    - text: Get Started Quickly
      link: ./001-guide/
features:
  - title: Based on Standards
    desc: >
      Create custom elements using standard JavaScript, HTML, and CSS technologies without needing to learn anything outside of these standards.


      Follow unified design principles to achieve high abstraction on top of standards, making it easy to get started while meeting various needs.

  - title: Declarative
    desc: >
      Define element properties and templates declaratively using decorators, making it readable without any learning curve.


      With TypeScript and plugins, type constraints and element diagnostics can also be performed.

  - title: Ecosystem
    desc: >
      Provide solutions for internationalization, localization, documentation generation, cross-framework component output, SSR (in development), and more.


      Also offers build optimizations (e.g., automatic imports) and development experience enhancements (e.g., HMR).
---

## TodoApp

<style>
[part=main] {
  width: clamp(100%, 90vw, 1024px);
  margin-left: calc((clamp(100%, 90vw, 1024px) - 100%) / -2);
}
</style>

<gbp-sandpack tailwind="basic" dependencies="@mantou/gem, duoyun-ui">

```ts
import { todoData, addItem } from './store';

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
        <dy-button style="flex-grow: 3" @click=${this.#onSubmit}>Add #${todoData.items.length + 1}</dy-button>
      </dy-input-group>
    `;
  };
}
```

```ts todo-list.ts
import { icons } from 'duoyun-ui/lib/icons';

import { todoData, deleteItem } from './store';

const styles = css`
  li:not(:hover) dy-use {
    opacity: 0;
  }
`;

@customElement('todo-list')
@connectStore(todoData)
@adoptedStyle(styles)
export class TodoListElement extends GemElement {
  render = () => {
    return html`
      <ul class="p-0">
        ${todoData.items.map(
          (item) => html`
            <li class="flex items-center justify-between py-1 border-t border-gray-300 last:border-b">
              <span>${item}</span>
              <dy-use class="w-5 p-1 hover:bg-gray-200" .element=${icons.close} @click=${() => deleteItem(item)}></dy-use>
            </li>
          `,
        )}
      </ul>
    `;
  };
}
```

```ts store.ts
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
