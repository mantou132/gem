# 路由

路由由文件系统决定。`src/pages` 中的一个文件就是一个页面，一个目录就是一段 URL，
少数特殊名称用来定义布局、动态参数和错误页面。

## 文件名

| 文件                                   | URL                |
| -------------------------------------- | ------------------ |
| `src/pages/index.ts`                   | `/`                |
| `src/pages/about.ts`                   | `/about`           |
| `src/pages/blog/index.ts`              | `/blog`            |
| `src/pages/blog/[slug].ts`             | `/blog/:slug`      |
| `src/pages/blog/[...rest].ts`          | `/blog/*`          |
| `src/pages/api/likes/[slug].server.ts` | `/api/likes/:slug` |
- `index` 对应目录路径：`blog/index.ts` 是 `/blog`，不是 `/blog/index`。
- `[name]` 匹配一段路径，通过 `params.name` 读取。
- `[...rest]` 匹配路径的剩余部分，包括剩余的多段路径。参数名是数字，模式中第一个通配参数是 `params[0]`。
- 页面模块可以是 `.js`、`.mjs`、`.cjs`、`.ts`、`.mts` 或 `.cts`。
- 名称以 `_` 或 `.` 开头的文件和目录不是页面，用来放 `_layout.ts`、`_error.ts` 等特殊文件，
  或者被页面导入的模块。测试文件（`*.test.*`、`*.spec.*`）和类型声明文件也会被忽略。
- 服务端同时接受 `/about` 和 `/about/`。客户端导航会移除 URL 末尾的 `/`，不重新渲染。

动态参数和通配路由只有在路径已知时才会预渲染，见[动态路径](./002-pages.md#动态路径)。

## 布局

目录中可以包含 `_layout.ts`。默认导出是用 `@layout` 标记的 Gem 元素，在子路由的位置渲染
`<gemkit-outlet>`：

```ts
// src/pages/blog/_layout.ts
@layout()
export default class BlogLayout extends GemElement {
  @template()
  #content = () =>
    html`
      <aside>Blog</aside>
      <section><gemkit-outlet></gemkit-outlet></section>
    `;
}
```

布局可以嵌套。`src/pages/_layout.ts` 是根布局，`src/pages/blog/_layout.ts` 包裹 `/blog` 下的内容。
布局本身不是路由，没有 URL。

在共享同一个布局的页面之间导航时，布局元素会被保留，只有子 outlet 改变，
所以布局中的滚动位置、展开的菜单等状态不会丢失。见[布局](./003-layouts.md)。

## 错误页面

`src/pages/_error.ts` 是错误页面，也是没有匹配的路径的 404 页面：

```ts
// src/pages/_error.ts
import type { ErrorData } from '@mantou/gemkit';

@page<{}, ErrorData>({ title: ({ data }) => `Error ${data.status}` })
export default class ErrorPage extends GemElement {
  @property data?: ErrorData;

  @template()
  #content = () => html`<h1>${this.data?.status}</h1><p>${this.data?.message}</p>`;
}
```

它没有 URL 模式，也没有服务端模块。它渲染在出错的页面或者布局的位置，请求保留原来的 URL：
- `load` 或者 `actions` 出错时，它渲染在出错路由的位置，外层布局保留
- 没有匹配的路径时渲染为 404 页面
- 意外错误的状态码是 `500`，生产环境中的信息是 `Internal Error`

`error()`、`notFound()` 和 `handleError` 见[错误和跳转](./007-request.md#错误和跳转)。

## 路由优先级

多个路由匹配同一个路径时，更具体的路由优先。每个布局中的路由按段排序：
1. 静态段
2. 动态段（`:name`）
3. 缺少的段，所以 `/` 在 `/*` 之前
4. 通配段（`*`）

例如 `/blog/new` 优先于 `/blog/[slug]`，`/blog` 优先于 `/blog/[...rest]`。

## 页面模块和服务端模块

页面模块和同名的 `*.server.ts` 是一对，文件名和路由都相同：

```
src/pages/blog/[slug].ts
src/pages/blog/[slug].server.ts
```

服务端模块只在服务端加载，客户端代码导入它会导致构建失败。

没有同名页面模块的 `*.server.ts` 是 [API 路由](./006-api-routes.md)。它和页面的路径相同时构建会报错。

## 应用文件

除了 `pages` 和 `locales`，这些可选文件用来配置应用：

| 文件                | 用途                                                                 |
| ------------------- | -------------------------------------------------------------------- |
| `src/app.ts`        | 在路由之前导入，用来设置全局样式、store 等。                         |
| `src/app.server.ts` | 服务端请求的 `handle` 和 `handleError`。                             |
| `src/app.client.ts` | 只在客户端执行，在 `src/app.ts` 之后导入，例如注册 service worker。  |
| `src/worker.ts`     | Cloudflare Worker 的其他导出，见[部署](./011-deploy.md#cloudflare)。 |
| `src/index.html`    | 替换默认的 HTML 模板，需要保留 `<!--gemkit-body-->`。                |
| `src/elements/*.ts` | 根据 `app-*` 标签自动导入的元素（见下文）。                          |

`src/elements` 中的元素可以直接在模板中使用，不需要导入。`src/elements/counter.ts` 就是
`app-counter` 元素，可以使用 [`gem.autoImport`](../reference/001-config.md#gem) 插件选项修改或者添加其他元素。
这个功能由 [unplugin-gem](https://github.com/mantou132/gem/tree/main/packages/unplugin-gem) 实现。

## 语言

语言前缀不属于页面目录树。有 `src/locales` 时，上面的每个路径也会出现在 `/{lang}` 下，
例如 `/zh/about`。默认语言默认没有前缀，见[国际化](./009-i18n.md)。
