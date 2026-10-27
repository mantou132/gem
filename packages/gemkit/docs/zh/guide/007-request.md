# 请求

服务端代码可以读取当前请求、设置 cookie、跳转，并在不同的处理函数之间共享数据。
`load`、`actions`、API 路由和服务端元素中都可以使用这些 API。

## 请求钩子

`src/app.server.ts` 可以导出 `handle`，它在每个服务端请求之前执行：页面、`__data.json`、
表单提交、服务端元素和 API 路由。

```ts
// src/app.server.ts
import type { RequestEvent } from '@mantou/gemkit';

declare module '@mantou/gemkit' {
  interface Locals {
    user?: User;
  }
}

export async function handle(event: RequestEvent) {
  if (!event.path.startsWith('/admin')) return;

  event.locals.user = await getUser(event.cookies.get('token'));
  if (!event.locals.user) redirect(302, '/login');
}
```

| 字段       | 说明                                                                          |
| ---------- | ----------------------------------------------------------------------------- |
| `url`      | 页面的 URL，包含语言前缀。                                                    |
| `path`     | 不包含语言前缀的页面路径，和路由匹配的路径一致。                              |
| `request`  | 当前的 `Request`，预渲染时不可用。                                            |
| `cookies`  | 请求的 cookie，预渲染时不可用。                                               |
| `locals`   | 同一个请求中，和 `load`、`actions`、API 路由、服务端元素共享的数据。          |
| `platform` | 部署平台的环境变量、绑定和 `waitUntil`，见[平台](#平台)。构建时预渲染时没有。 |

按路径检查时使用 `path`，不要使用 `url.pathname`。`__data.json` 和服务端元素的请求也使用页面 URL。

`locals` 是一个空接口，使用 `declare module` 扩展类型。它属于单个请求，可以安全地存放用户数据。
- 权限检查放在 `handle` 中，不要放在布局 `load` 中。布局 `load` 不会在表单提交和服务端元素中执行，
  而且在 `__data.json` 中页面 `load` 和它并行执行，即使布局跳转也不会阻止页面 `load`。
- 预渲染时 `handle` 也会执行。在其中读取 `request` 或 `cookies`、跳转或者抛出错误会让页面不被预渲染。
  只对需要这些功能的路径读取它们，预渲染的页面是公开的。
- 页面和布局都没有服务端 `load` 时，客户端导航不会发送请求，`handle` 不会执行。
  首次加载时页面数据已经输出到文档中，客户端导航时使用本地数据渲染。
  这些页面没有服务端数据，提交 `actions` 时 `handle` 仍然会执行，所以不会泄露数据。
- 需要登录的区域如果要在导航进入时就跳转到登录页，在它的 `_layout.server.ts` 中导出 `load`（例如返回当前用户）。
  客户端导航进入时会请求数据，`handle` 执行并跳转，权限检查仍然放在 `handle` 中：

```ts
// src/pages/admin/_layout.server.ts
export const load = ({ locals }: ServerLoadContext) => ({ user: locals.user });
```

## getRequestEvent

`getRequestEvent()` 返回当前的 `{ url, path, request, cookies, locals, platform }`。它属于当前请求，
在服务端请求之外调用会抛出错误。服务端元素等没有参数的服务端代码可以使用它：

```ts
const { locals } = getRequestEvent();
```

## 平台

`platform` 是部署平台提供的 `{ env, ctx }`，`handle`、`load`、`actions`、API 路由和服务端元素都可以读取：

| 平台                 | `env`                                   | `ctx`                                  |
| -------------------- | --------------------------------------- | -------------------------------------- |
| Cloudflare           | Worker 的 `env`，包括 KV、D1、AI 等绑定 | `ExecutionContext`                     |
| Netlify              | `process.env`                           | Netlify 的 `Context`                   |
| Vercel               | `process.env`                           | 只有 `waitUntil`                       |
| `gemkit start`、开发 | `process.env`                           | 只有 `waitUntil`，进程不会在响应后退出 |

`ctx.waitUntil(promise)` 在响应后继续执行后台任务，例如记录日志、写入统计。
`env` 的类型是空接口 `PlatformEnv`，使用 `declare module` 声明：

```ts
// src/app.server.ts
declare module '@mantou/gemkit' {
  interface PlatformEnv {
    DB: D1Database;
    AI: Ai;
  }
}

// src/pages/posts/[id].server.ts
export async function load({ params, platform }: ServerLoadContext<{ id: string }>) {
  return platform!.env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(params.id).first();
}
```

构建时预渲染没有平台上下文，`platform` 为 `undefined`；需要它的页面导出 `prerender = false`，
或者使用 [ISR](./011-deploy.md#增量静态再生成)，ISR 在请求中渲染时使用该请求的 `platform`。

## 错误和跳转

`error(status, message?)` 抛出错误，渲染[错误页面](./001-routing.md#错误页面)。
`notFound()` 等同于 `error(404, 'Not Found')`。在 `load` 中出错时，错误页面渲染在出错的页面或者布局的位置，
外层布局保留。

`redirect(status, location)` 抛出并响应跳转：

```ts
redirect(302, '/login');
```

`location` 是包含语言前缀的完整路径。服务端响应对应的状态码和 `Location` 头。
客户端导航时数据文件中包含跳转地址，Gemkit 会导航到该地址。预渲染的跳转写成
`<meta http-equiv="refresh">` 页面，所以静态托管也可以使用。

不是由 `error()` 抛出的意外错误在服务端交给 `handleError`：

```ts
// src/app.server.ts
export function handleError(error: unknown, event: RequestEvent) {
  reportError(error, event.url);
}
```

默认使用 `console.error`。错误页面显示状态码 `500`，生产环境中的信息是 `Internal Error`。
预渲染时出现意外错误会让构建失败，避免发布错误的页面。

## Cookie

```ts
import type { ServerLoadContext } from '@mantou/gemkit';

export const prerender = false;

export function load({ cookies }: ServerLoadContext) {
  const theme = cookies.get('theme');
  cookies.set('theme', 'dark', { maxAge: 60 * 60 * 24 * 365 });
  return { theme };
}
```

`cookies.set(name, value, options)` 和 `cookies.delete(name, options)` 会在响应中添加 `Set-Cookie`。
默认是 `Path=/; HttpOnly; SameSite=Lax`，HTTPS 时 `Secure` 为 `true`，`maxAge` 的单位是秒。
同一个请求中，之前 `set` 的值可以通过 `get` 读取。

响应文档开始流式输出之后设置的 cookie（例如在 `@server()` 方法中）会被忽略。
应该在 `handle`、`load` 或者 `actions` 中设置。

读取 `request` 或 `cookies`，或者设置 cookie 的响应使用 `Cache-Control: private, no-store`，
CDN 不会在用户之间共享它们。

## 预渲染

预渲染时没有请求。页面或者布局读取请求、cookie 时，需要在服务端模块中导出 `prerender = false`：

```ts
// src/pages/account.server.ts
export const prerender = false;
```

在布局中设置时，对它下面的所有页面生效。
