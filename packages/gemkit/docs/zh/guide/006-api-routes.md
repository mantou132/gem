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

API 路由没有语言前缀。`handle` 在处理函数之前执行，`event.path` 是 API 路径。
参数和 `load` 相同：`params`、`url`、`request`、`cookies` 和 `locals`。
处理函数中设置的 cookie 会添加到响应中。

支持的方法有 `GET`、`POST`、`PUT`、`PATCH` 和 `DELETE`。只导出 `GET` 时，`HEAD` 使用 `GET`。
其他方法响应 `405`，并带有 `Allow` 头。

## 响应

- 返回 `Response` 可以控制状态码、响应头和内容。
- 返回其他值会作为 JSON 响应。
- `redirect(status, location)` 响应跳转。
- `error(status, message)` 响应 `{ status, message }` 的 JSON。

抛出的意外错误响应状态码 `500` 和 JSON 错误，在服务端会交给 `src/app.server.ts` 的 `handleError`。

## 类型化客户端

`$gemkit/api` 根据 API 路由生成。静态路径段是属性，动态段是函数调用，最后是 HTTP 方法，
参数和结果都从处理函数推导：

```ts
import { apis } from '$gemkit/api';

const result = await apis.api.likes(slug).POST({ count: 1 });
const res = await apis.api.likes(slug).DELETE();

// 属性可以解构，调用链从第一个动态段开始。
const { api } = apis;
const likes = await api.likes(slug).GET();
```

- 请求发送到 API 路径，不包含语言前缀。
- JSON 响应会解析，其他响应返回原始 `Response`。
- `error()` 响应会 reject `HttpError`，它有 `status` 和 `message`。
- 输入只有类型，需要校验内容时在处理函数中检查，例如写入数据库之前。
- 处理函数仍然可以自己读取 `request`，例如 `request.formData()`。

## 安全

- 跨站的表单类型请求（`application/x-www-form-urlencoded`、`multipart/form-data`、`text/plain`）
  会被拒绝（CSRF）。
- 其他跨站请求需要 CORS 预检。没有 `Origin` 的请求（例如 webhook）不受影响。
- 一组 API 路由的权限检查使用 [`handle`](./007-request.md)。

## 部署

API 路由不会被预渲染。开发时和 `gemkit start` 可以使用，静态托管不可用。
