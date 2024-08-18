---
title: 使用 WebComponents 快速构建复杂的高性能 WebApp
hero:
  title: Gem
  desc: 使用 WebComponents 快速构建复杂的高性能 WebApp
  actions:
    - text: 快速开始
      link: ./001-guide/
features:
  - title: 基于 WebComponents
    desc: >
      构建管理其自身状态的封装元素，然后对其进行组合以构成复杂的 UI。


      使用熟悉的 ES Classes 语法来编写自定义元素，并声明自定义元素的数据和属性。

  - title: 声明式模版
    desc: >
      Gem 的简单，熟悉的开发模型使构建 Web 组件比以往更加容易。


      根据状态声明性地表达 UI。 无需学习自定义模板语言-您可以在模板中使用 JavaScript 的全部功能。 元素的属性更改时会自动更新。

  - title: 观察模式
    desc: >
      全局数据的管理，路由的修改全部使用观察模式。


      使用观察模式来连接自定义元素和数据，在数据更新时高效的更新你的 WebApp，只需要将注意力集中在业务逻辑上。
---

## 待办事项 App

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
      <dy-heading>待办事项列表</dy-heading>
      <todo-list></todo-list>
      <dy-heading lv="3">需要做什么？</dy-heading>
      <dy-input-group>
        <dy-input id="new-todo" @change=${this.#onChange} .value=${this.#state.input}></dy-input>
        <dy-button @click=${this.#onSubmit}>添加 #${todoData.items.length + 1}</dy-button>
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
  css,
  createCSSSheet,
  adoptedStyle,
} from '@mantou/gem';
import { icons } from 'duoyun-ui/lib/icons';

import { todoData, deleteItem } from './store';

import 'duoyun-ui/elements/use';

const style = createCSSSheet(css`
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
`);

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
import { useStore } from '@mantou/gem';

type Store = { items: string[] };

export const [todoData, update] = useStore<Store>({ items: [] });

export const addItem = (item: string) => {
  update({ items: [...todoData.items, item] });
};

export const deleteItem = (item: string) => {
  update({ items: todoData.items.filter((e) => e !== item) });
};
```

</gbp-sandpack>
