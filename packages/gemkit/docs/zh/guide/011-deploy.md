# 部署

生产构建有两部分：

| 产物          | 内容                                                                                 |
| ------------- | ------------------------------------------------------------------------------------ |
| `dist/web`    | 客户端资源、预渲染的页面、`__data.json`、`__elements.json`、`404.html`               |
| `dist/server` | 服务端产物，以及动态渲染使用的 HTML 模板                                             |
| `dist/cache`  | 设置了 `revalidate` 的页面，`gemkit start` 使用，见[增量静态再生成](#增量静态再生成) |

在项目中执行构建：

```sh
npm run build
```

模板定义了 `dev`、`build` 和 `start` 脚本，pnpm、yarn 使用同样的命令。

## 静态托管

把 `dist/web` 部署到静态托管，例如 Netlify、Cloudflare Pages，或者带 CDN 的对象存储。
- 路由是包含 `index.html` 的目录，不需要 SPA 重写。
- 没有匹配的路径使用生成的 `404.html`，大多数静态托管会自动这样做。
- `/static/` 下带 hash 的文件（以及其他不会变化的资源）可以长期缓存。HTML 和数据文件不要使用同样的规则，
  这样部署后能立即看到新内容。
- 跳转写成 `<meta http-equiv="refresh">` 页面，客户端导航时从数据文件的 `redirect` 字段读取。
- `prerender = false` 的页面、设置了 `revalidate` 的页面、API 路由和表单 `actions` 不可用。
- 按需渲染的服务端元素不可用，只有预渲染时收集到 `__elements.json` 的 HTML 可以使用。

静态托管忽略查询参数，总是返回同一个文件。页面的 `load` 读取 `url.searchParams` 时需要服务器。
`gemkit start` 会渲染带查询参数的请求，而不使用预渲染的文件。

没有服务端模块的页面首次加载时使用文档中输出的数据，客户端导航时使用本地数据，所以完全可以部署到静态托管。

### 单页应用

根布局导出 [`ssr = false`](./010-rendering.md#只在客户端渲染) 时，构建会输出 `dist/web/200.html`，
所有路径都可以使用它，由客户端渲染：
- Surge 等会自动使用 `200.html`；`404.html` 的内容相同，GitHub Pages 等使用 `404.html` 也能显示页面（状态码是 404）。
- Netlify 在 `public/_redirects`（构建时复制到 `dist/web`）中添加 `/* /200.html 200`，Cloudflare 设置 `"not_found_handling": "single-page-application"`
  时使用的是 `index.html`，即预渲染的首页。
- Tauri 等 WebView 加载部署后的地址，或者把 `dist/web` 作为前端资源目录（入口是预渲染的 `index.html`）。

没有预渲染的路径的服务端 `load`、`actions`、API 路由和纯服务端元素仍然需要服务器，单页应用中纯服务端元素都需要按需渲染。

## Node.js

部署整个 `dist` 目录，然后运行：

```sh
npm run start
```

`gemkit start` 提供 `dist/web` 的文件，其他请求使用 `dist/server` 渲染。它支持 `-p, --port <port>` 选项或读取：
- `PORT`：HTTP 端口，默认 `3000`
- `ORIGIN`：站点的公开地址，例如 `https://example.com`

部署在反向代理后面时设置 `ORIGIN`。`load` 中的 `url`、`Secure` cookie 和同源检查都使用它。
不设置时，origin 来自 `Host` 请求头和连接协议，在终止 TLS 的代理后面是 HTTP。

服务端进程运行时需要 `@mantou/gemkit` 和应用依赖。在容器或者托管 Node 环境中，
安装生产依赖，并把工作目录设置为包含 `dist` 的项目根目录。

## 部署平台

在 Vercel、Netlify 和 Cloudflare 上构建时，Gemkit 识别出平台，输出平台需要的文件，不需要服务器。
也可以用 [`adapter`](../reference/001-config.md#adapter) 指定平台，例如 `adapter: cloudflare()`。
预渲染的文件由平台作为静态文件提供，其他请求（不能预渲染的页面、API 路由、`actions`、按需渲染的服务端元素）
由平台的函数处理。

| 平台       | 输出                                      | ISR                     |
| ---------- | ----------------------------------------- | ----------------------- |
| Vercel     | `.vercel/output`（Build Output API）      | Vercel 的 CDN 缓存      |
| Netlify    | `.netlify/v1/functions`                   | Netlify 的持久 CDN 缓存 |
| Cloudflare | `dist/cloudflare/index.js`（Worker 入口） | 绑定的 KV               |

### Vercel

构建命令是 `npm run build`，不需要其他配置。函数使用 Node.js 运行时。

### Netlify

在 `netlify.toml` 中设置静态文件目录：

```toml
[build]
  command = "npm run build"
  publish = "dist/web"
```

### Cloudflare

部署到 Workers，静态文件使用 Workers Static Assets。在项目根目录添加 `wrangler.jsonc`：

```jsonc
{
  "name": "my-app",
  "main": "dist/cloudflare/index.js",
  "compatibility_date": "2026-03-01",
  // gem-ssr 使用 `AsyncLocalStorage` 隔离每个请求的状态
  "compatibility_flags": ["nodejs_compat"],
  // Gemkit 的路径没有末尾的 `/`
  "assets": { "directory": "dist/web", "html_handling": "drop-trailing-slash" },
  // 可选，ISR 使用的 KV
  "kv_namespaces": [{ "binding": "GEMKIT_CACHE", "id": "<namespace id>" }]
}
```

然后执行 `npm run build` 和 `npx wrangler deploy`。Worker 中没有文件系统，服务端代码不能在运行时读取项目中的文件，
需要在构建时读取（例如预渲染），或者打包到代码中。

Worker 的 `env`（KV、D1、AI、Vectorize 等绑定）和 `ctx` 通过 [`platform`](./007-request.md#平台) 传给
`handle`、`load`、`actions`、API 路由和服务端元素。

Worker 的其他导出写在 `src/worker.ts` 中，构建时合并到 Worker 入口：
- 默认导出的处理函数（例如 `scheduled`、`queue`）合并到 Worker 的默认导出，`fetch` 由 Gemkit 处理。
- 其他导出（例如 Durable Object、Workflow 类）原样导出，在 `wrangler.jsonc` 中绑定。

```ts
// src/worker.ts
import { DurableObject } from 'cloudflare:workers';

export class Counter extends DurableObject {
  async increment() {
    const value = ((await this.ctx.storage.get<number>('value')) || 0) + 1;
    await this.ctx.storage.put('value', value);
    return value;
  }
}

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(cleanup(env));
  },
} satisfies ExportedHandler<Env>;
```

`src/worker.ts` 由 Wrangler 打包，不经过 Rsbuild，所以可以导入 `cloudflare:workers`，但没有 Gem 的编译和自动导入，
也和应用的服务端代码是不同的模块实例。

### ISR

- Vercel 和 Netlify 由 CDN 缓存设置了 `revalidate` 的页面：响应带有 `stale-while-revalidate` 的 CDN 缓存头，
  过期后 CDN 先返回旧内容，在后台请求函数重新渲染。`revalidatePath` 不能清除 CDN 缓存，页面在过期后更新。
- Cloudflare 绑定了 `GEMKIT_CACHE` KV 时，和 `gemkit start` 一样缓存页面和数据文件，在 `waitUntil` 中重新渲染。
  没有绑定时每次请求都渲染。

### 自定义适配器

其他平台可以实现 `GemkitAdapter`，由两部分组成：
- `runtime`：运行时模块（包名或者绝对路径），服务端构建时打包。导出 `createHandler(renderer, template)`，
  返回平台需要的处理函数。一般使用 `@mantou/gemkit/handler` 的 `createFetchHandler`，
  它处理页面、数据、表单、服务端元素和 API 路由的请求，参数提供平台的差异：
  `readStatic`（读取预渲染的文件，平台优先提供静态文件时不需要）、`isrStore`（ISR 的存储）
  或者 `cdnCache`（ISR 使用 CDN 缓存时的响应头）。处理函数的第二个参数是平台的 [`{ env, ctx }`](./007-request.md#平台)。
- `write(ctx)`：构建后输出平台需要的文件。`ctx.handlerFile` 是服务端构建的函数入口，它命名导出
  `createHandler(template)`，平台的入口用 `ctx.template` 调用它。`ctx.webDir` 是需要作为静态文件提供的目录，`ctx.srcDir` 是源码目录，
  `ctx.cacheDir` 是设置了 `revalidate` 的页面在构建时预渲染的文件，平台支持时可以作为 ISR 的初始缓存。

```ts
// my-adapter/runtime.ts
import { createFetchHandler } from '@mantou/gemkit/handler';
import type { Renderer } from '@mantou/gemkit/server';

export function createHandler(renderer: Renderer, template: string) {
  return createFetchHandler(renderer, template);
}
```

```ts
// my-adapter/index.ts
import fs from 'node:fs';
import path from 'node:path';
import type { GemkitAdapter } from '@mantou/gemkit/plugin';

export const myAdapter = (): GemkitAdapter => ({
  name: 'my-platform',
  runtime: 'my-adapter/runtime',
  write({ distDir, handlerFile, template }) {
    const file = path.join(distDir, 'my-platform/server.mjs');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(
      file,
      `import { createHandler } from ${JSON.stringify(handlerFile)};\n` +
        `export default createHandler(${JSON.stringify(template)});\n`,
    );
  },
});
```

服务端产物是 CommonJS，并且没有拆分 chunk，平台可以直接运行，也可以再打包。

## 增量静态再生成

商品、文章这类页面数量很多、内容会变化，不适合全部在构建时预渲染。在服务端模块中导出 `revalidate`（秒）：

```ts
// src/pages/products/[id].server.ts
export const revalidate = 60;

export const paths = async () => (await getHotProducts()).map(({ id }) => ({ id }));

export async function load({ params }: ServerLoadContext<{ id: string }>) {
  return getProduct(params.id);
}
```

- `paths` 只返回热门的页面，构建时预渲染。其他页面在 `gemkit start` 第一次请求时预渲染并缓存。
- 缓存超过 `revalidate` 秒后，先返回旧内容，在后台重新渲染，同一个页面同时只渲染一次。
- 页面、`__data.json` 和 `__elements.json` 一起缓存，客户端导航也使用缓存，不需要服务端渲染元素。
- 和预渲染的条件一样：读取请求或 cookie 的页面、带查询参数的请求不缓存。渲染结果不是 200（例如跳转、出错）时
  也不缓存，由服务端渲染。
- 修改数据后可以在 action 或者 API 路由中调用 `revalidatePath(pathname)` 清除缓存，下次请求时重新渲染。
- 缓存在 `dist/cache` 中，每次构建时清空。多个服务器实例的缓存不共享，serverless 等文件系统不可写的环境使用平台的缓存，
  见[部署平台](#isr)。

价格、库存这类需要实时的内容，放在 API 路由中由客户端请求，或者使用按需渲染的服务端元素。

## 缓存

读取请求或 cookie、设置 cookie 的响应会带有 `Cache-Control: private, no-store`，
CDN 不会共享这些因人而异的内容。配置代理时保留这个响应头。

动态渲染的响应可以使用 [`setHeaders`](./007-request.md#响应头) 设置 `Cache-Control` 等响应头。
预渲染的文件由静态服务器或者平台提供，没有这些响应头，需要在平台中配置。

预渲染的 HTML 和 `__data.json` 是公开文件，但新的部署会替换相同路径的内容。
使用较短的缓存时间，或者在部署后清除缓存。`dist/web/static` 中带 hash 的资源不会改变，可以长期缓存。

## 不同环境的区别

- 开发时每次请求都渲染，并且有 HMR。
- 生产构建会预渲染页面，并启用 `process.env.GEMKIT_PRERENDER`。
- `prerender = false` 的页面、ISR、API 路由、`actions` 和按需渲染的服务端元素需要 `gemkit start`、
  [部署平台](#部署平台)的函数，或者其他运行 Gemkit 处理器的服务器。
- 静态托管和 `gemkit start` 对查询参数的处理不同，见上文。
