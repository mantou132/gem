# 布局

布局包裹所在目录以及嵌套目录中的页面。它是用 `@layout` 标记的 Gem 元素，
在子路由的位置渲染 `<gemkit-outlet>`。

```
src/pages/
  _layout.ts           根布局
  index.ts             /
  blog/
    _layout.ts         包裹 /blog、/blog/hello 等
    index.ts           /blog
    [slug].ts          /blog/:slug
```

## 定义布局

```ts
// src/pages/blog/_layout.ts
@layout()
export default class BlogLayout extends GemElement {
  @template()
  #content = () =>
    html`
      <aside>Categories</aside>
      <article><gemkit-outlet></gemkit-outlet></article>
    `;
}
```

根布局是 `src/pages/_layout.ts`，包裹包括错误页面在内的所有页面。布局本身没有 URL，
通过所在的目录匹配。

在共享布局的页面之间导航时，嵌套布局会被保留。根布局在整个会话中保留（切换语言除外），
嵌套布局在参数不变时保留。侧边栏、标签页等 UI 不应该在每次导航时重新创建。

## 布局数据

布局可以像页面一样加载数据：

```ts
// src/pages/blog/_layout.ts
@layout({
  load: () => fetch('/api/categories').then((res) => res.json()),
})
export default class BlogLayout extends GemElement {
  @property data?: { name: string }[];

  @template()
  #content = () =>
    html`
      <aside>${this.data?.map(({ name }) => html`<a>${name}</a>`)}</aside>
      <article><gemkit-outlet></gemkit-outlet></article>
    `;
}
```

参数和页面一样是 `{ params, data }`。`params` 只包含布局目录中的段，不包含子路由的部分。
例如 `src/pages/users/[id]/_layout.ts` 中，`/users/:id` 下任何页面的 `params` 都是 `{ id }`。

结果作为 `data` 属性传给布局元素，可以是 JSON 值，规则和页面 `load` 相同。

在子路由之间导航时，如果布局的参数没有改变，布局数据会被复用。提交表单或者 `invalidate()` 后会重新加载，
因为请求可能改变了它依赖的状态，例如当前用户。

布局也可以有同名的 `_layout.server.ts`，它的 `load` 结果作为 `data` 传给 `load`。
需要每个请求都执行的权限检查应该使用[请求钩子](../guide/007-request.md)，而不是布局 `load`：
布局 `load` 不会在表单提交和服务端元素中执行，而且客户端导航时它和页面 `load` 并行执行。

## Meta

布局支持 `meta`，它会和页面的 meta 合并，内层的路由覆盖同名的 key：

```ts
@layout({
  meta: { 'og:site_name': 'My Site' },
})
```

## 错误

页面或者布局 `load` 抛出错误时，[错误页面](./001-routing.md#错误页面)渲染在出错路由的位置，
外层布局保留。所以 404 页面中仍然显示布局的导航和页脚。

## 根布局和 `<gemkit-outlet>`

根布局是可选的。没有根布局时页面直接渲染在根 outlet 中。有根布局时先渲染布局模板，
由 `<gemkit-outlet>` 渲染匹配的子布局或者页面。

布局中只渲染一个 `<gemkit-outlet>`。它通过父元素找到所属布局的路由。
