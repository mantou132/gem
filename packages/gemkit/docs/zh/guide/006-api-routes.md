# API 路由

`src/pages` 中没有同名页面模块的 `*.server.ts` 是 API 路由，按 HTTP 方法导出处理函数。

```ts
// src/pages/api/likes/[slug].server.ts -> /api/likes/:slug
import type { ServerLoadContext } from '@mantou/gemkit';

type Context = ServerLoadContext<{ slug: string }>;

// 返回 `Response` 以外的值会作为 JSON 响应。
export const GET = ({ params }: Context) => ({ likes: getLikes(params.slug) });

// 第二个参数是输入：`GET` 和 `DELETE` 是查询参数，其他方法是 JSON 请求体。
export const POST = ({ params }: Context, input: { count: number }) => ({
  likes: addLikes(params.slug, input.count),
});

export const DELETE = () => new Response(null, { status: 204 });
```

## 文件映射

| 文件                                   | URL                |
| -------------------------------------- | ------------------ |
| `src/pages/api/likes/[slug].server.ts` | `/api/likes/:slug` |
| `src/pages/api/likes/index.server.ts`  | `/api/likes`       |
| `src/pages/rss.xml.server.ts`          | `/rss.xml`         |

API 路由和页面的路径相同时构建会报错，因为 API 路由先匹配，页面只能通过客户端导航访问。

API 路由没有语言前缀。`handle` 在处理函数之前执行，`event.path` 是 API 路径。
参数和 `load` 相同：`params`、`url`、`request`、`cookies` 和 `locals`。
处理函数中设置的 cookie 会添加到响应中。

支持的方法有 `GET`、`POST`、`PUT`、`PATCH` 和 `DELETE`。只导出 `GET` 时，`HEAD` 使用 `GET`。
其他方法响应 `405`，并带有 `Allow` 头。

## 响应

- 返回 `Response` 可以控制状态码、响应头和内容。
- 返回其他值会作为 JSON 响应。
- `redirect(status, location)` 响应跳转，`$gemkit/api` 调用时客户端导航。
- `error(status, message)` 响应 `{ status, message }` 的 JSON。

抛出的意外错误响应状态码 `500` 和 JSON 错误，在服务端会交给 `src/app.server.ts` 的 `handleError`。

## 类型化客户端

`$gemkit/api` 根据 API 路由生成。静态路径段是属性，动态段是函数调用，最后是 HTTP 方法，
参数和结果都从处理函数推导：

```ts
const result = await apis.api.likes(slug).POST({ count: 1 });
const res = await apis.api.likes(slug).DELETE();

// 属性可以解构，调用链从第一个动态段开始。
const { api } = apis;
const likes = await api.likes(slug).GET();
```

- 请求发送到 API 路径，不包含语言前缀。
- JSON 响应会解析，其他响应返回原始 `Response`。
- `error()` 响应会 reject `HttpError`，它有 `status`、`message` 和 schema 校验的 `issues`。
- 处理函数或者 `handle` 跳转时，客户端清除预取的结果和历史缓存，导航到目标地址，调用不会 resolve。
  请求头 `x-gemkit-client` 表示由它发送，服务端响应 `x-gemkit-redirect` 而不是 3xx，因为 `fetch` 会自动跟随跳转。
- 输入只有类型，需要校验内容时使用 [`endpoint`](#校验输入)，或者在处理函数中检查，例如写入数据库之前。
- 处理函数仍然可以自己读取 `request`，例如 `request.formData()`。

## 重新加载数据

调用 API 修改数据后，页面和 layout 的 `load` 的结果已经过期。`invalidate()` 重新加载它们，不刷新页面：

```ts
await apis.api.likes(slug).POST({ count: 1 });
await invalidate();
```

- 页面元素被复用，所以输入框的状态保留，滚动位置不变。
- 预取的结果和历史缓存都不再使用，layout 也重新加载数据。
- 页面渲染后 resolve。

## 校验输入

`endpoint(schema, handler)` 使用 [Standard Schema](https://standardschema.dev)（zod、valibot、arktype 等）
校验和转换输入：

```ts
// src/pages/api/posts/[slug].server.ts
import { z } from 'zod';

export const GET = endpoint(z.object({ page: z.coerce.number() }), ({ params }, { page }) =>
  getComments(params.slug, page),
);
```

- 校验失败时响应 `400`，`HttpError` 的 `issues` 是校验的问题。
- 查询参数的值都是字符串，需要转换类型时使用 schema 的转换，例如 `z.coerce.number()`。
- `$gemkit/api` 的参数类型是 schema 的输出类型：客户端传入处理函数期望的值，
  作为查询参数传输时变成字符串，由 schema 转换回来。

## 安全

- 跨站的表单类型请求（`application/x-www-form-urlencoded`、`multipart/form-data`、`text/plain`）
  会被拒绝（CSRF）。
- 其他跨站请求需要 CORS 预检。没有 `Origin` 的请求（例如 webhook）不受影响。
- 一组 API 路由的权限检查使用 [`handle`](./007-request.md)。

## 部署

API 路由不会被预渲染。开发时和 `gemkit start` 可以使用，静态托管不可用。
