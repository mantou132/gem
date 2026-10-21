# Gem

使用其他语言阅读：[English](./README.md) | 简体中文

基于 Web Components 构建可复用的自定义元素和 WebApp，并按项目需要组合 Gem 的各层能力。

## 特色

- **从轻量自定义元素开始：**
  使用 Gem 的响应式和装饰器能力，不引入模板引擎；需要时再添加 `GemElement` 和 HTML 模板渲染。

- **开发 UI 库：**
  Gem 元素是标准自定义元素；组件需要样式隔离时优先使用 Shadow DOM，并通过 [gem-port](packages/gem-port) 生成 React、Vue 和 Svelte 包装组件，供相应框架生态使用。

- **开发完整应用：**
  使用 `@mantou/gem` 提供的路由、history 和 Store；[gemkit](packages/gemkit) 进一步提供文件路由、布局、SSR 和 SSG。应用界面优先使用 Light DOM，便于 Tailwind CSS 等全局 CSS 方案直接生效。

- **沿用熟悉的 Web 标准：**
  基于浏览器的自定义元素模型，使用 HTML 模板、CSS 和 JavaScript 构建界面，无需学习 JSX 或单文件组件等 DSL。

- **异步渲染：**
  `@async()` 会分批渲染大量元素，并让出主线程，保持界面响应。

## 文档

- [Guide](https://gemjs.org/guide/)
- [API](https://gemjs.org/api/)

## 项目结构

| 目录                                            | 描述                                                                                            |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [gem](packages/gem)                             | Gem 核心                                                                                        |
| [gem-ssr](packages/gem-ssr)                     | Gem 自定义元素的服务端渲染与水合                                                                |
| [gemkit](packages/gemkit)                       | 提供文件路由、布局、SSR 和 SSG 的应用框架                                                       |
| [gem-devtools](packages/gem-devtools)           | Gem 的浏览器调试工具                                                                            |
| [gem-analyzer](packages/gem-analyzer)           | Gem 元素分析器，能自动生成文档                                                                  |
| [gem-book](packages/gem-book)                   | 使用 Gem 创建的文档站生成器                                                                     |
| [duoyun-ui](packages/duoyun-ui)                 | 使用 Gem 创建的桌面 UI 库                                                                       |
| [tap-ui](packages/tap-ui)                       | 使用 Gem 创建的移动优先 UI 库                                                                   |
| [gem-port](packages/gem-port)                   | 将 Gem 元素导出为 React/Vue/Svelte 组件                                                         |
| [gem-examples](packages/gem-examples)           | 一些 Gem 和 DuoyunUI 示例                                                                       |
| [ts-gem-plugin](packages/ts-gem-plugin)         | TypeScript 的 Gem 语言服务插件                                                                  |
| [ts-gem-lsp](packages/ts-gem-lsp)               | TypeScript 7 的 Gem 语言服务器                                                                  |
| [swc-plugin-gem](crates/swc-plugin-gem)         | [SWC](https://swc.rs/) 构建插件                                                                 |
| [unplugin-gem](packages/unplugin-gem)           | 通用构建插件，支持 Vite/Webpack/Rollup/esbuild/Rspack/Rolldown                                  |
| [zed-plugin-gem](crates/zed-plugin-gem)         | [Zed](https://zed.dev/) 扩展                                                                    |
| [vscode-gem-plugin](packages/vscode-gem-plugin) | VSCode [扩展](https://marketplace.visualstudio.com/items?itemName=gem-vscode.vscode-plugin-gem) |

[路线图](https://mm.tt/app/map/3412316197?t=TGs84FRcwQ)。

## 贡献

Fork 项目并提交 PR。
