# 服务端数据

只能在服务端使用的数据在同名 `*.server.ts` 中加载。它不会打包到客户端，结果以 JSON 的形式发送给客户端。

```
src/pages/blog/[slug].ts
src/pages/blog/[slug].server.ts
```

## `load`

```ts
// src/pages/blog/[slug].server.ts
import { readFile } from 'node:fs/promises';

export async function load({ params }: { params: { slug: string } }) {
  return { markdown: await readFile(`content/${params.slug}.md`, 'utf8') };
}
```

```ts
// src/pages/blog/[slug].ts
@page<{ slug: string }, { markdown: string }>({
  load: ({ data }) => parseMarkdown(data.markdown),
})
export default class PostPage extends GemElement {
  @property data?: { html: string };

  @template()
  #content = () => html`<article .innerHTML=${this.data?.html}></article>`;
}
```

结果必须可以序列化成 JSON。它作为 `data` 传给页面或者布局，同时作为页面 `load` 的 `data` 参数。
- **服务端渲染**：数据输出到 HTML 中，水合时直接使用，不再请求。
- **客户端导航**：Gemkit 请求 `<页面路径>/__data.json`，其中包含页面和所有布局的服务端数据。
- **预渲染**：数据文件写在页面旁边，所以静态托管时客户端导航也可以使用。
- **跳转或者错误**：服务端 `load` 调用 `redirect()` 或者 `error()` 时页面不会渲染，
  见[请求](./007-request.md)。

客户端代码导入 `*.server.ts` 模块会导致构建失败，所以可以在其中安全地使用只能在服务端使用的包和 Node.js API。

## 动态路径

动态路由需要预渲染的路径列表通过 `paths` 导出。每种语言调用一次，参数是 `{ lang }`：

```ts
// src/pages/blog/[slug].server.ts
export async function paths({ lang }: { lang: string }) {
  return (await getPosts(lang)).map(({ slug }) => ({ slug }));
}
```

同样的选项也可以定义在页面中，适合没有服务端模块的情况。见[动态路径](./002-pages.md#动态路径)。

## 关闭预渲染

页面依赖请求时，在服务端模块中导出 `prerender = false`：

```ts
// src/pages/account.server.ts
import type { ServerLoadContext } from '@mantou/gemkit';

export const prerender = false;

export function load({ cookies }: ServerLoadContext) {
  return { user: cookies.get('user') ?? null };
}
```

预渲染时没有请求，所以 `request` 和 `cookies` 会抛出错误。`handle` 读取它们时页面不会被预渲染。
`load` 需要它们时，页面必须导出 `prerender = false`，否则构建时会渲染失败。
在布局的服务端模块中设置 `prerender = false` 时，对该布局下的所有页面生效。

## 请求、cookie 和跳转

`load` 的参数包含 `params`、`url`、`request`、`cookies` 和 `locals`：

```ts
// src/pages/editor.server.ts
import type { ServerLoadContext } from '@mantou/gemkit';

export const prerender = false;

export function load({ cookies }: ServerLoadContext) {
  if (!cookies.get('token')) redirect(302, '/login');
  return { draft: loadDraft(cookies.get('token')) };
}
```

`redirect(status, location)` 会抛出并停止渲染。`location` 是包含语言前缀的完整路径。
服务端响应使用该状态码和 `Location` 头，客户端导航时 Gemkit 导航到该地址。
预渲染的跳转写成 `<meta http-equiv="refresh">` 页面，数据文件中包含跳转地址，所以静态托管也可以使用。

`cookies.set` 和 `cookies.delete` 会在响应中添加 `Set-Cookie`。读取请求或者 cookie、设置 cookie 的响应使用
`Cache-Control: private, no-store`。详见[请求](./007-request.md)。

## 查询参数

预渲染的文件对任何查询参数都是同一个。如果 `load` 读取了 `url.searchParams`，页面就不能预渲染。
`gemkit start` 会在运行时渲染带查询参数的请求，但静态托管会忽略查询参数，直接使用预渲染的文件。
这类页面需要服务器，或者应该把状态放在路径中。

## 服务端 store

在服务端更新的模块级 store（例如在 `@server()` 方法中）会自动发送给客户端，水合时使用服务端的值，
所以首屏和 HTML 一致。只支持 JSON 值。
