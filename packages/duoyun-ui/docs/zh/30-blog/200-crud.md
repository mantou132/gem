# 使用模式创建 CRUD 应用

DuoyunUI 的[模式元素](../01-guide/55-pattern.md)和帮助模块能让你快速创建一个 CRUD 应用（[示例](https://examples.gemjs.org/console/)，[React 示例](https://stackblitz.com/edit/stackblitz-starters-vyqlvr?file=src%2Findex.tsx&view=editor)），这篇文章将使用：

- `<dy-pat-console>` 创建 App 基本布局
- `<dy-pat-table>` 创建表格页面
- `helper/error` 显示错误信息

<gbp-media src="/preview.png"></gbp-media>

## 步骤1：创建 App 框架

`<dy-pat-console>` 元素使用两栏布局并占满整个视口，将 `<dy-pat-console>` 插入 `body` 元素即可看到基本布局。

<gbp-code-group>

```js Gem
import { render, html } from '@mantou/gem';
import 'duoyun-ui/patterns/console';

render(html`<dy-pat-console></dy-pat-console>`, document.body);
```

```js React
import { createRoot } from 'react-dom/client';
import DyPatConsole from 'duoyun-ui/react/DyPatConsole';

createRoot(document.body).render(<DyPatConsole />);
```

</gbp-code-group>

### 定义路由和侧边栏导航

`<dy-pat-console>` 使用 `<gem-route>` 实现路由，路由不仅仅被用来匹配显示内容，还可以被用作导航参数；
`<dy-pat-console>` 的侧边栏导航也兼容路由格式，在渲染前面一同定义它们：

<gbp-code-group>

```js Gem
import { html } from '@mantou/gem';
import type { Routes, NavItems } from 'duoyun-ui/patterns/console';

const routes = {
  home: {
    pattern: '/',
    title: 'Home',
    getContent() {
      return html`Home`;
    },
  },
  item: {
    pattern: '/items/:id',
    title: 'Item Page',
    async getContent(params) {
      // import('./item');
      return html`<console-page-item>${JSON.stringify(params)}</console-page-item>`;
    },
  },
} satisfies Routes;

const navItems: NavItems = [
  routes.home,
  {
    ...routes.item,
    params: { id: crypto.randomUUID() },
  },
];
```

```tsx React
import { createRoot } from 'react-dom/client';
import type { Routes, NavItems } from 'duoyun-ui/patterns/console';

const routes = {
  home: {
    pattern: '/',
    title: 'Home',
    getContent(_, ele) {
      createRoot(ele).render(<>Home</>);
    },
  },
  item: {
    pattern: '/items/:id',
    title: 'Item Page',
    async getContent(params, ele) {
      // await import('./item');
      createRoot(ele).render(<>{JSON.stringify(params)}</>);
    },
  },
} satisfies Routes;

const navItems: NavItems = [
  routes.home,
  {
    ...routes.item,
    params: { id: crypto.randomUUID() },
  },
];
```

</gbp-code-group>

### 定义用户信息和全局菜单

之后，可以指定用户信息用来标识用户，还可以定义一些全局命令，比如切换语言、退出登录：

```js
import { Toast } from 'duoyun-ui/elements/toast';
import type { ContextMenus, UserInfo } from 'duoyun-ui/patterns/console';

const contextMenus: ContextMenus = [
  {
    text: 'Languages',
    handle: () => Toast.open('default', 'No Implement!'),
  },
  { text: '---' },
  {
    text: 'Logout',
    handle: () => Toast.open('error', 'No Implement!'),
    danger: true,
  },
];

const userInfo: UserInfo = {
  username: 'Mantou',
  org: 'DuoyunUI',
  profile: '/about',
};
```

### 配置 `<dy-pat-console>`

修改渲染函数，并指定其他配置项：

<gbp-code-group>

```js Gem
render(
  html`
    <dy-pat-console
      name="DuoyunUI"
      .logo=${'https://duoyun-ui.gemjs.org/logo.png'}
      .routes=${routes}
      .navItems=${navItems}
      .contextMenus=${contextMenus}
      .userInfo=${userInfo}
      .keyboardAccess=${true}
      .responsive=${true}
    ></dy-pat-console>
  `,
  document.body,
);
```

```tsx React
createRoot(document.body).render(
  <DyPatConsole
    name="DuoyunUI"
    logo="https://duoyun-ui.gemjs.org/logo.png"
    routes={routes}
    navItems={navItems}
    contextMenus={contextMenus}
    userInfo={userInfo}
    keyboardAccess={true}
    responsive={true}
  />,
);
```

</gbp-code-group>

## 步骤2：创建页面

现在来实现一个具有 CRUD 功能等表格页面，首先创建一个显示空表格的页面（`item.ts`），并修改路由：

<gbp-code-group>

```js Gem
import { html, GemElement, connectStore, customElement } from '@mantou/gem';
import { locationStore } from 'duoyun-ui/patterns/console';
import 'duoyun-ui/patterns/table';

@customElement('console-page-item')
@connectStore(locationStore)
export class ConsolePageItemElement extends GemElement {
  render = () => {
    return html`<dy-pat-table></dy-pat-table>`;
  };
}
```

```tsx React
import { useState, useEffect } from 'react';
import { connect } from '@mantou/gem';
import { locationStore } from 'duoyun-ui/react/DyPatConsole';
import DyPatTable from 'duoyun-ui/react/DyPatTable';

export function Item() {
  const [i, update] = useState(0);
  useEffect(() => connect(locationStore, () => update(i + 1)), []);
  return <DyPatTable></DyPatTable>;
}
```

</gbp-code-group>

<gbp-code-group>

```diff Gem
{
  item: {
    pattern: '/items/:id',
    title: 'Item Page',
    async getContent() {
-     // await import('./item');
+     await import('./item');
      return html`<console-page-item></console-page-item>`;
    },
  }
}
```

```diff React
{
  item: {
    pattern: '/items/:id',
    title: 'Item Page',
    async getContent(params, ele) {
-      // import('./item');
-      createRoot(ele).render(<>{JSON.stringify(params)}</>);
+      const { Item } = await import('./item');
+      createRoot(ele).render(<Item />);
    },
  },
}
```

</gbp-code-group>

### 读取列表并渲染表格

<gbp-code-group>

```js Gem
import { html, GemElement, connectStore, customElement } from '@mantou/gem';
import { get } from '@mantou/gem/helper/request';
import { locationStore } from 'duoyun-ui/patterns/console';
import type { FilterableColumn } from 'duoyun-ui/patterns/table';
import 'duoyun-ui/patterns/table';

@customElement('console-page-item')
@connectStore(locationStore)
export class ConsolePageItemElement extends GemElement {
  state = {}

  #columns: FilterableColumn[] = [
    {
      title: 'No',
      dataIndex: 'id',
    }
  ];

  mounted = async () => {
    const data = await get(`https://jsonplaceholder.typicode.com/users`);
    this.setState({ data });
  };

  render = () => {
    return html`<dy-pat-table filterable .columns=${this.#columns} .data=${this.state.data}></dy-pat-table>`;
  };
}
```

```tsx React
import { connect } from '@mantou/gem';
import { get } from '@mantou/gem/helper/request';
import { locationStore } from 'duoyun-ui/patterns/console';
import { DyPatTable, FilterableColumn } from 'duoyun-ui/patterns/table';

export function Item() {
  const [i, update] = useState(0);
  useEffect(() => connect(locationStore, () => update(i + 1)), []);

  const [data, updateData] = useState();
  useEffect(() => {
    get(`https://jsonplaceholder.typicode.com/users`).then(updateData);
  }, []);

  const columns: FilterableColumn[] = [
    {
      title: 'No',
      dataIndex: 'id',
    },
  ];

  return (
    <DyPatTable filterable={true} columns={columns} data={data}></DyPatTable>
  );
}
```

</gbp-code-group>

### 为表格行添加删除和更新命令

只需添加带有 `getActions` 的列：

```js
import { ContextMenu } from 'duoyun-ui/elements/contextmenu';

const columns: FilterableColumn[] = [
  // ...
  {
    title: '',
    getActions: (r, activeElement) => [
      {
        text: 'Edit',
        handle: () => {
          onUpdate(r)
        },
      },
      {
        text: 'Delete',
        danger: true,
        handle: async () => {
          await ContextMenu.confirm(`Confirm delete ${r.username}?`, { activeElement, danger: true });
          console.log('Delete: ', r);
        },
      },
    ],
  },
];
```

### 实现更新和删除

首先需要像定义表格一样定义表单：

```js
import type { FormItem } from 'duoyun-ui/patterns/form';

const formItems: FormItem[] = [
  {
    type: 'text',
    field: 'username',
    label: 'Username',
    required: true,
  }
]
```

接着实现 `onCreate` 和 `onUpdate`，并在页面中添加 `Create` 按钮：

```js
import { createForm } from 'duoyun-ui/patterns/form';

function onUpdate(r) {
  createForm({
    data: r,
    header: `Update: ${r.id}`,
    formItems: formItems,
    prepareOk: async (data) => {
      console.log(data);
    },
  }).catch((data) => {
    console.log(data);
  });
}

function onCreate() {
  createForm({
    type: 'modal',
    data: {},
    header: `Create`,
    formItems: formItems,
    prepareOk: async (data) => {
      console.log(data);
    },
  }).catch((data) => {
    console.log(data);
  });
}
```

<gbp-code-group>

```js Gem
// ...

html`
  <dy-pat-table filterable .data=${this.state.data} .columns=${this.#columns}>
    <dy-button @click=${onCreate}>Create</dy-button>
  </dy-pat-table>
`;
```

```tsx React
// ...

<DyPatTable filterable={true} columns={columns} data={data}>
  <DyButton onClick={onCreate}>Create</DyButton>
</DyPatTable>
```

</gbp-code-group>

> [!TIP] `<dy-pat-table>` 还支持：
>
> - 使用 `expandedRowRender` 展开行，`@expand` 获取展开事件
> - 使用 `lazy` 和 `@change` 来处理分页信息（默认认为 `data` 是所有数据）
> - 使用 `selectable` 让表格可以框选，使用 `getSelectedActions` 添加选择项命令

## 步骤3：处理错误

在主文件开头引入 `helper/error`，它通过 `Toast` 显示错误信息，它也能显示未处理但被拒绝的 Promise：

```js
import 'duoyun-ui/helper/error';
```

现在，这个 CRUD 应用看起来应该是[这样](https://examples.gemjs.org/console/)。
