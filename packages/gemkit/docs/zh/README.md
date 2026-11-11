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
    icon: 📁
    desc: '`src/pages` 中的文件就是路由，支持嵌套布局、动态参数，页面按需加载'
  - title: SSR 和 SSG
    icon: ⚡
    desc: 页面在服务端渲染、浏览器中水合，不依赖请求的页面预渲染后可部署到静态托管
  - title: 服务端元素
    icon: 🏝️
    desc: '`@server()` 让代码不进入客户端，`@lazy()` 在交互时才加载'
  - title: 感知请求
    icon: 🔐
    desc: 在 `load` 中读取 cookie，用 `actions` 处理表单，用请求钩子保护路径，API 路由就是普通模块
  - title: 国际化
    icon: 🌐
    desc: 语言包放在 `src/locales`，自动获得带前缀的 URL、翻译后的页面和语言识别
  - title: Rsbuild 原生
    icon: 🦀
    desc: Gemkit 是 Rsbuild 插件，开发服务器、配置和插件都照常使用
---

## 从一个文件开始

```ts
// src/pages/index.ts
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

## 性能对比

用 Gemkit、SvelteKit、Nuxt 和 Next.js 实现同一个 [RealWorld](https://github.com/gothinkster/realworld) 应用（相同的 API 和 CSS）。
Gemkit 通过了 91 个官方 e2e 测试中的 84 个；
源码、未通过的用例和测试方法见 [realworld 仓库](https://github.com/mantou132/realworld/tree/framework-comparison/frameworks)。

![客户端 JavaScript](https://raw.githubusercontent.com/mantou132/realworld/framework-comparison/frameworks/bench/results/charts/1-js.png)
![SSR 吞吐量](https://raw.githubusercontent.com/mantou132/realworld/framework-comparison/frameworks/bench/results/charts/2-ssr.png)
![Lighthouse](https://raw.githubusercontent.com/mantou132/realworld/framework-comparison/frameworks/bench/results/charts/3-lighthouse.png)
![客户端导航和代码量](https://raw.githubusercontent.com/mantou132/realworld/framework-comparison/frameworks/bench/results/charts/4-dx.png)

## 相关包

Gemkit 基于 [Gem](https://gemjs.org) 和
[gem-ssr](https://github.com/mantou132/gem/tree/main/packages/gem-ssr) 实现，
[GemBook](https://book.gemjs.org) 使用它构建文档网站。
