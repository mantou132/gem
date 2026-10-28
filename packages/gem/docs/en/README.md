---
title: Build Fast, Standards-Based Web Components and Apps
hero:
  title: Gem
  desc: Build fast, standards-based web components and apps
  actions:
    - text: Get Started
      link: ./001-guide/
    - text: GitHub
      link: https://github.com/mantou132/gem
features:
  - title: Based on Standards
    icon: 🧩
    desc: Create custom elements with plain JavaScript, HTML and CSS, with nothing new to learn
  - title: Declarative
    icon: ✍️
    desc: Declare properties and templates with decorators, with type checking and element diagnostics from TypeScript
  - title: Ecosystem
    icon: 🌐
    desc: Internationalization, documentation, SSR/SSG with [gemkit](https://github.com/mantou132/gem/tree/main/packages/gemkit), auto-import and HMR built in
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

  @template()
  #content = () => {
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
  @template()
  #content = () => {
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
