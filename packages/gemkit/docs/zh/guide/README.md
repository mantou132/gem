# 简介

Gemkit 是 [Gem](https://gemjs.org) 的应用框架，构建在 [Rsbuild](https://rsbuild.rs) 之上。
它把 `src/pages` 中的文件变成路由，在服务端渲染每个页面，然后在浏览器中水合。
不依赖请求的页面在构建时预渲染（SSG），所以同一个应用既可以部署到静态托管，也可以部署到 Node.js 服务器。

Gemkit 是一个 Rsbuild 插件，Rsbuild 的配置、开发服务器、构建流程和插件都可以继续使用。

## 创建应用

```sh
npm create gemkit@latest my-app
# 或者
npx @mantou/gemkit init my-app
```

目录必须为空或者不存在。然后：

```sh
cd my-app
pnpm install
pnpm dev
```

## 命令

| 命令            | 说明                                                                                    |
| --------------- | --------------------------------------------------------------------------------------- |
| `rsbuild dev`   | 启动带 SSR 和 HMR 的开发服务器，每次请求时渲染页面。                                    |
| `rsbuild build` | 构建 `dist/web`（客户端资源和预渲染的页面）和 `dist/server`（服务端产物和 HTML 模板）。 |
| `gemkit start`  | 提供 `dist` 的内容，优先使用预渲染的页面，其他请求由服务端渲染。                        |
| `gemkit init`   | 在空目录或者不存在的目录中，使用模板创建应用。                                          |

`gemkit start` 支持 `-p, --port <port>` 选项或读取这些环境变量：
- `PORT`：HTTP 端口，默认 `3000`
- `ORIGIN`：站点的公开地址，例如 `https://example.com`。部署在反向代理后面时必须设置，
  否则 origin 来自 `Host` 请求头和连接协议。`load` 中的 `url`、`Secure` cookie 和同源检查都使用它。

构建产物和部署方式见[部署](./011-deploy.md)。

## 添加到已有的 Rsbuild 项目

```ts
// rsbuild.config.ts
import { pluginGemkit } from '@mantou/gemkit/plugin';
import { defineConfig } from '@rsbuild/core';

export default defineConfig({
  plugins: [pluginGemkit({ title: 'My Site', titleTemplate: '%s | My Site' })],
});
```

插件会在 `.gemkit` 中生成路由表、客户端入口和服务端入口，并构建 `web` 和 `node` 两个环境。
你仍然可以添加其他 Rsbuild 插件和配置。

## 项目结构

```
src/
  app.ts               可选，在页面之前导入（全局样式、store）
  app.server.ts        可选，`handle` 在每个服务端请求前执行
  index.html           可选，HTML 模板，使用 `<!--gemkit-body-->` 作为内容占位符
  elements/            可选，`app-*` 标签会自动导入
  pages/
    _layout.ts         根布局，渲染 `<gemkit-outlet>` 显示子路由
    _error.ts          错误页面，也是没有匹配的路径的 404 页面
    index.ts           /
    about.ts           /about
    blog/
      _layout.ts       嵌套布局，在 /blog/* 页面之间导航时保留
      index.ts         /blog
      [slug].ts        /blog/:slug
      [...rest].ts     /blog/*
  locales/
    en.json            默认语言，没有路径前缀
    zh.json            /zh/*
```

只有 `pages` 目录是必需的，`locales` 只在需要[国际化](./009-i18n.md)时使用。布局是可选的，没有 `_layout.ts` 时页面直接渲染在根 outlet 中。

## 页面

```ts
// src/pages/about.ts
@page('About')
export default class AboutPage extends GemElement {
  @template()
  #content = () => html`<h1>About</h1>`;
}
```

默认导出必须是一个 Gem 元素。标签名由文件路径生成，所以不需要调用 `@customElement`，
文件路径同时决定了 URL。

Gem 和常用的 Gemkit API 会自动导入，所以本文档的示例省略了它们的导入。见 [`gem`](../reference/001-config.md#gem)。

## 布局

```ts
// src/pages/_layout.ts
@layout()
export default class RootLayout extends GemElement {
  @template()
  #content = () =>
    html`
      <header>My Site</header>
      <main><gemkit-outlet></gemkit-outlet></main>
    `;
}
```

`<gemkit-outlet>` 渲染下一个匹配的布局或者页面。在同一个布局下的页面之间导航时，
布局会被保留，状态不会重新创建。

## 接下来

- [路由](./001-routing.md)：文件如何变成 URL
- [页面](./002-pages.md)：`load`、`title`、`meta` 和 `paths`
- [服务端数据](./004-server-data.md)：感知请求的数据和预渲染
- [服务端元素](./008-server-elements.md)：`@server()`、`@lazy()` 和 `@client()`
- [渲染](./010-rendering.md)：首屏、水合和导航时发生了什么
- [参考](../reference/001-config.md)：所有插件选项
