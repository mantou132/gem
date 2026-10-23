---
hero:
  title: Gemkit
  desc: 基于 Rsbuild 的 Gem 应用框架，提供文件路由、布局、多语言、SSR 和 SSG。
  actions:
    - text: 开始使用
      link: ./guide/README.md
    - text: GitHub
      link: https://github.com/mantou132/gem/tree/main/packages/gemkit
features:
  - title: 文件路由
    desc: >
      在 `src/pages` 中创建文件就是一个路由。嵌套目录、动态参数、通配路由、布局和错误页面
      都由文件系统决定。


      路由模块按需加载，没有访问的页面不会下载代码。
  - title: SSR 和 SSG
    desc: >
      每个页面都在服务端渲染，然后在浏览器中水合。不依赖请求的页面在构建时预渲染，
      可以部署到任意静态托管。


      服务端数据直接输出到文档中，水合时不需要再请求。
  - title: 服务端元素
    desc: >
      使用 `@server()` 标记的元素，代码和依赖不会打包到客户端；使用 `@lazy()` 标记的元素，
      在用户交互时才加载代码。


      同一个页面可以混合静态 HTML、交互孤岛和完全由服务端渲染的部分。
  - title: 感知请求
    desc: >
      在 `load` 中读取 cookie 和请求，一行代码完成跳转；使用 `actions` 处理表单提交；
      使用请求钩子统一保护一组路径。


      API 路由就是导出 `GET`、`POST` 等 HTTP 方法的普通模块。
  - title: 国际化
    desc: >
      语言包放在 `src/locales`，自动获得带语言前缀的 URL、翻译后的页面和服务端语言识别，
      不需要编写路由样板代码。
  - title: Rsbuild 原生
    desc: >
      Gemkit 是一个 Rsbuild 插件。照常配置 Rsbuild，使用它的开发服务器、环境配置和构建插件等
      所有功能。
---

## 从一个文件开始

```ts
// src/pages/index.ts
import { GemElement, html, template } from '@mantou/gem';
import { page } from '@mantou/gemkit';

@page('Home')
export default class HomePage extends GemElement {
  @template()
  #content = () => html`<h1>Hello Gemkit</h1>`;
}
```

这就是一个完整的页面。Gemkit 会生成路由、客户端入口和服务端入口。
同一个页面会预渲染成 `dist/web/index.html`，并在客户端水合。

```sh
npm create gemkit@latest my-app
cd my-app
pnpm dev
```

继续阅读[指南](./guide/README.md)，了解数据加载、布局、表单、服务端元素和部署。

## 相关包

Gemkit 基于 [Gem](https://gemjs.org) 和
[gem-ssr](https://github.com/mantou132/gem/tree/main/packages/gem-ssr) 实现，
[GemBook](https://book.gemjs.org) 使用它构建文档网站。
