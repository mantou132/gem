---
title: 基于 Web 标准，快速构建 UI 组件和高性能应用
hero:
  title: Gem
  desc: 基于 Web 标准，快速构建 UI 组件和高性能应用
  actions:
    - text: 快速开始
      link: ./001-guide/
    - text: GitHub
      link: https://github.com/mantou132/gem
features:
  - title: 基于标准
    icon: 🧩
    desc: 使用标准 JavaScript、HTML、CSS 创建自定义元素，无需学习额外概念
  - title: 声明式
    icon: ✍️
    desc: 用装饰器声明属性和模板，配合 TypeScript 获得类型检查和元素诊断
  - title: 生态系统
    icon: 🌐
    desc: 内置国际化、文档生成、SSR/SSG（[gemkit](https://github.com/mantou132/gem/tree/main/packages/gemkit)）、自动导入和 HMR
---

## 待办事项 App

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
      <dy-heading>待办事项列表</dy-heading>
      <todo-list></todo-list>
      <dy-heading lv="3">需要做什么？</dy-heading>
      <dy-input-group>
        <dy-input id="new-todo" @change=${this.#onChange} .value=${this.#state.input}></dy-input>
        <dy-button style="flex-grow: 3" @click=${this.#onSubmit}>添加 #${todoData.items.length + 1}</dy-button>
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
