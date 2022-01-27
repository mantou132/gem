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
