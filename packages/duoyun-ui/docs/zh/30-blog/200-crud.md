# 使用模式创建 CRUD 应用

DuoyunUI 的[模式元素](../01-guide/55-pattern.md)和帮助模块能让你快速创建一个 CRUD 应用（[示例](https://examples.gemjs.org/console/)，[React 示例](https://stackblitz.com/edit/stackblitz-starters-vyqlvr?file=src%2Findex.tsx&view=editor)），这篇文章将使用：

- `<dy-pat-console>` 创建 App 基本布局
- `<dy-pat-table>` 创建表格页面
- `helper/store` 创建分页数据管理器
- `helper/error` 显示错误信息

<gbp-media src="/preview.png"></gbp-media>

## 步骤1：创建 App 框架

`<dy-pat-console>` 元素使用两栏布局并占满整个视口，将 `<dy-pat-console>` 插入 `body` 元素即可看到基本布局。

<gbp-code-group>

```ts Gem
import { render, html } from '@mantou/gem';
import 'duoyun-ui/patterns/console';

render(html`<dy-pat-console></dy-pat-console>`, document.body);
```

```tsx React
import { createRoot } from 'react-dom/client';
import DyPatConsole from 'duoyun-ui/react/DyPatConsole';

createRoot(document.body).render(<DyPatConsole />);
```

</gbp-code-group>

### 定义路由和侧边栏导航

`<dy-pat-console>` 使用 `<gem-route>` 实现路由，路由不仅仅被用来匹配显示内容，还可以被用作导航参数；
`<dy-pat-console>` 的侧边栏导航也兼容路由格式，在渲染前面一同定义它们：

<gbp-code-group>

```ts Gem
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
      ele.react?.unmount();
      ele.react = createRoot(ele);
      ele.react.render(<>Home</>);
    },
  },
  item: {
    pattern: '/items/:id',
    title: 'Item Page',
    async getContent(params, ele) {
      ele.react?.unmount();
      ele.react = createRoot(ele);
      ele.react.render(<>{JSON.stringify(params)}</>);
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

> [!WARNING]
> 使用 React 渲染页面时，为了更好的和 Gem 兼容，需要先卸载以挂载的 Root 节点，再重新创建 React Root 并渲染。

### 定义用户信息和全局菜单

之后，可以指定用户信息用来标识用户，还可以定义一些全局命令，比如切换语言、退出登录：

```ts
import { Toast } from 'duoyun-ui/elements/toast';
import type { ContextMenus, UserInfo } from 'duoyun-ui/patterns/console';

const contextMenus: ContextMenus = [
  {
    text: 'Languages',
    handle: () => Toast.open('info', 'No Implement!'),
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

```ts Gem
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

```ts Gem
import { html, GemElement, connectStore, customElement } from '@mantou/gem';
import 'duoyun-ui/patterns/table';

@customElement('console-page-item')
export class ConsolePageItemElement extends GemElement {
  render = () => {
    return html`<dy-pat-table></dy-pat-table>`;
  };
}
```

```tsx React
import { useState, useEffect } from 'react';
import { connect } from '@mantou/gem';
import DyPatTable from 'duoyun-ui/react/DyPatTable';

export function Item() {
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
-      createRoot(ele).render(<>{JSON.stringify(params)}</>);
+      const { Item } = await import('./item');
+      createRoot(ele).render(<Item />);
    },
  },
}
```

</gbp-code-group>

### 读取列表并渲染表格

接下来从后端获取数据并填充表格，URL 参数比如 `id` 可以从 `locationStore` 读取，它由 `<dy-pat-console>` 创建，以响应 App 路由更新，它不会从[正在加载但还未显示的页面](https://gemjs.org/zh/blog/improve-route)中获取更新。
需要将它和页面绑定，以保证 `id` 改变时页面响应变化。

<gbp-code-group>

```ts Gem
import { html, GemElement, connectStore, customElement, createState, effect } from '@mantou/gem';
import { get } from '@mantou/gem/helper/request';
import { locationStore } from 'duoyun-ui/patterns/console';
import type { FilterableColumn } from 'duoyun-ui/patterns/table';
import 'duoyun-ui/patterns/table';

@customElement('console-page-item')
@connectStore(locationStore)
export class ConsolePageItemElement extends GemElement {
  #state = createState<{ data: any }>({});

  #columns: FilterableColumn<any>[] = [
    {
      title: 'No',
      dataIndex: 'id',
    },
  ];

  @effect((i) => [locationStore.params.id])
  #fetch = async ([id]) => {
    const data = await get(`https://jsonplaceholder.typicode.com/users`);
    this.#state({ data });
  };

  render = () => {
    return html`
      <dy-pat-table filterable .columns=${this.#columns} .data=${this.#state.data}></dy-pat-table>
    `;
  };
}
```

```tsx React
import { useState, useEffect } from 'react';
import { connect } from '@mantou/gem';
import { get } from '@mantou/gem/helper/request';
import { locationStore } from 'duoyun-ui/patterns/console';
import DyPatTable, { FilterableColumn } from 'duoyun-ui/react/DyPatTable';

export function Item() {
  const [_, update] = useState({});
  useEffect(() => connect(locationStore, () => update({})), []);

  const [data, updateData] = useState();
  useEffect(() => {
    // const id = locationStore.params.id;
    get(`https://jsonplaceholder.typicode.com/users`).then(updateData);
  }, [locationStore.params.id]);

  const columns: FilterableColumn<any>[] = [
    {
      title: 'No',
      dataIndex: 'id',
    },
  ];

  return <DyPatTable filterable={true} columns={columns} data={data}></DyPatTable>;
}
```

</gbp-code-group>

### 为表格行添加删除和更新命令

只需添加带有 `getActions` 的列：

```ts
import { ContextMenu } from 'duoyun-ui/elements/contextmenu';

const columns: FilterableColumn<any>[] = [
  // ...
  {
    title: '',
    getActions: (r, activeElement) => [
      {
        text: 'Edit',
        handle: () => {
          onUpdate(r);
        },
      },
      {
        text: 'Delete',
        danger: true,
        handle: async () => {
          await ContextMenu.confirm(`Confirm delete ${r.username}?`, {
            activeElement,
            danger: true,
          });
          console.log('Delete: ', r);
        },
      },
    ],
  },
];
```

### 实现更新和删除

首先需要像定义表格一样定义表单：

```ts
import type { FormItem } from 'duoyun-ui/patterns/form';

const formItems: FormItem<any>[] = [
  {
    type: 'text',
    field: 'username',
    label: 'Username',
    required: true,
  },
];
```

接着实现 `onCreate` 和 `onUpdate`，并在页面中添加 `Create` 按钮：

```ts
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

```ts Gem
// ...

html`
  <dy-pat-table filterable .columns=${this.#columns} .data=${this.state.data}>
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

## 步骤3：服务端分页（可选）

到目前为止，应用虽然有分页、搜索、过滤功能，但这都是通过客户端实现的，意味着需要一次性为 `<dy-pat-table>` 提供所有数据。
在真实生产环境中，通常由服务端进行分页、搜索、过滤，只需要小的修改即可实现：

<gbp-code-group>

```ts Gem 7-8
// ...

html`
  <dy-pat-table
    filterable
    .columns=${this.#columns}
    .paginationStore=${pagination.store}
    @fetch=${this.#onFetch}
  >
    <dy-button @click=${onCreate}>Create</dy-button>
  </dy-pat-table>
`;
```

```tsx React 6-7
// ...

<DyPatTable
  filterable={true}
  columns={columns}
  paginationStore={pagination.store}
  onfetch={onFetch}
>
  <DyButton onClick={onCreate}>Create</DyButton>
</DyPatTable>
```

</gbp-code-group>

其中，`store` 是使用 `createPaginationStore` 创建的分页数据：

```ts
import { Time } from 'duoyun-ui/lib/time';
import { createPaginationStore } from 'duoyun-ui/helper/store';
import type { FetchEventDetail } from 'duoyun-ui/patterns/table';

const pagination = createPaginationStore({
  storageKey: 'users',
  cacheItems: true,
  pageContainItem: true,
});

// 模拟真实 API
const fetchList = (args: FetchEventDetail) => {
  return get(`https://jsonplaceholder.typicode.com/users`).then((list) => {
    list.forEach((e, i) => {
      e.updated = new Time().subtract(i + 1, 'd').getTime();
      e.id += 10 * (args.page - 1);
    });
    return { list, count: list.length * 3 };
  });
};

const onFetch = ({ detail }: CustomEvent<FetchEventDetail>) => {
  pagination.updatePage(fetchList, detail);
};
```

<details>
  <summary>优化搜索结果展示（可选）</summary>
  
  当在有搜索词和无搜索词之间切换时，页面不能立刻切换到新列表，可以为搜索词分配独立的 `pagination`：

```ts
@customElement('console-page-item')
export class ConsolePageItemElement extends GemElement {
  #state = createState({
    pagination: pagination,
    paginationMap: new Map([['', pagination]]),
  });

  #onFetch = ({ detail }: CustomEvent<FetchEventDetail>) => {
    let pagination = this.#state.paginationMap.get(detail.searchAndFilterKey);
    if (!pagination) {
      pagination = createPaginationStore<Item>({
        cacheItems: true,
        pageContainItem: true,
      });
      this.#state.paginationMap.set(detail.searchAndFilterKey, pagination);
    }
    this.#state({ pagination });
    pagination.updatePage(fetchList, detail);
  };
}
```

</details>

> [!TIP] `<dy-pat-table>` 还支持：
>
> - 使用 `expandedRowRender` 展开行，`@expand` 获取展开事件
> - 使用 `selectable` 让表格可以框选，使用 `getSelectedActions` 添加选择项命令

## 步骤4：处理错误

在主文件开头引入 `helper/error`，它通过 `Toast` 显示错误信息，它也能显示未处理但被拒绝的 Promise：

```ts
import 'duoyun-ui/helper/error';
```

现在，这个 CRUD 应用看起来应该是[这样](https://examples.gemjs.org/console/)。
