---
title: 快速构建 UI 组件、高性能 WebApp
hero:
  title: Gem
  desc: 快速构建 UI 组件、高性能 WebApp
  actions:
    - text: 快速开始
      link: ./001-guide/
features:
  - title: 基于标准
    desc: >
      使用标准 JavaScript、HTML、CSS 技术创建自定义元素，无需学习标准外任何东西。


      遵循统一设计原则在标准之上进行高度抽象，既能简单上手，又能满足各种需求。

  - title: 声明式
    desc: >
      使用装饰器声明式定义元素属性和模板，不需要任何学习即可阅读。


      配合 TypeScript 以及插件，还可以进行类型约束、元素诊断。

  - title: 生态系统
    desc: >
      提供国际化、本地化、文档生成、组件跨框架输出、SSR（开发中）等解决方案。


      还提供构建优化（例如自动导入）、开发体验优化（例如 HMR）。
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

  render = () => {
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

const style = css`
  li:not(:hover) dy-use {
    opacity: 0;
  }
`;

@customElement('todo-list')
@connectStore(todoData)
@adoptedStyle(style)
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
