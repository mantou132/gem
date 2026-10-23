# 部署

生产构建有两部分：

| 产物          | 内容                                                                   |
| ------------- | ---------------------------------------------------------------------- |
| `dist/web`    | 客户端资源、预渲染的页面、`__data.json`、`__elements.json`、`404.html` |
| `dist/server` | 服务端产物，以及动态渲染使用的 HTML 模板                               |

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
- `prerender = false` 的页面、API 路由和表单 `actions` 不可用。
- 按需渲染的服务端元素不可用，只有预渲染时收集到 `__elements.json` 的 HTML 可以使用。

静态托管忽略查询参数，总是返回同一个文件。页面的 `load` 读取 `url.searchParams` 时需要服务器。
`gemkit start` 会渲染带查询参数的请求，而不使用预渲染的文件。

没有服务端模块的页面首次加载时使用文档中输出的数据，客户端导航时使用本地数据，所以完全可以部署到静态托管。

## Node.js

部署整个 `dist` 目录，然后运行：

```sh
npm run start
```

`gemkit start` 提供 `dist/web` 的文件，其他请求使用 `dist/server` 渲染。它读取：
- `PORT`：HTTP 端口，默认 `3000`
- `ORIGIN`：站点的公开地址，例如 `https://example.com`

部署在反向代理后面时设置 `ORIGIN`。`load` 中的 `url`、`Secure` cookie 和同源检查都使用它。
不设置时，origin 来自 `Host` 请求头和连接协议，在终止 TLS 的代理后面是 HTTP。

服务端进程运行时需要 `@mantou/gemkit` 和应用依赖。在容器或者托管 Node 环境中，
安装生产依赖，并把工作目录设置为包含 `dist` 的项目根目录。

## 缓存

读取请求或 cookie、设置 cookie 的响应会带有 `Cache-Control: private, no-store`，
CDN 不会共享这些因人而异的内容。配置代理时保留这个响应头。

预渲染的 HTML 和 `__data.json` 是公开文件，但新的部署会替换相同路径的内容。
使用较短的缓存时间，或者在部署后清除缓存。`dist/web/static` 中带 hash 的资源不会改变，可以长期缓存。

## 不同环境的区别

- 开发时每次请求都渲染，并且有 HMR。
- 生产构建会预渲染页面，并启用 `process.env.GEMKIT_PRERENDER`。
- `prerender = false` 的页面、API 路由、`actions` 和按需渲染的服务端元素需要 `gemkit start`，
  或者其他运行 Gemkit 处理器的服务器。
- 静态托管和 `gemkit start` 对查询参数的处理不同，见上文。
