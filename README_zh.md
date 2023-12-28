# Gem

使用其他语言阅读：[English](./README.md) | 简体中文

创建自定义元素, 绑定数据, 路由切换, 快速基于自定义元素开发 WebApp。
从 [mt-music-player](https://github.com/mantou132/mt-music-player) 中剥离出来。

## 特色

- **轻巧：**
  整个库只有三个基础模块（自定义元素，全局数据管理，路由），
  内置的自定义元素可以自己选择是否使用，
  所有内容打包在一起也只有 15kb（br 压缩）。

- **简单：**
  没有全新的语法，一切都是 HTML，CSS，JavaScript。
  没有多余的概念，只需要“Observe”就能创建反应式自定义元素；

- **高性能：**
  模版引擎使用 [lit-html](https://github.com/Polymer/lit-html)，
  打包文件大小，增删改查的性能以及内存占有都要优于 React，Vue，
  [这里](https://rawgit.com/krausest/js-framework-benchmark/master/webdriver-ts-results/table.html)是 lit-html 和 React，Vue 的性能比较；

- **异步渲染：**
  连续渲染（例如列表项）类元素时会避免长时间阻塞主线程，提供流畅的用户体验；

## 文档

- [Guide](https://gemjs.org/guide/)
- [API](https://gemjs.org/api/)

## 项目结构

| 目录                                           | 描述                                    |
| ---------------------------------------------- | --------------------------------------- |
| [packages/gem](packages/gem)                   | Gem 核心                                |
| [packages/gem-devtools](packages/gem-devtools) | Gem 的浏览器调试工具                    |
| [packages/gem-analyzer](packages/gem-analyzer) | Gem 元素分析器，能自动生成文档          |
| [packages/gem-book](packages/gem-book)         | 使用 Gem 创建的文档站生成器             |
| [packages/duoyun-ui](packages/duoyun-ui)       | 使用 Gem 创建的 UI 库                   |
| [packages/gem-port](packages/gem-port)         | 将 Gem 元素导出为 React/Vue/Svelte 组件 |
| [packages/gem-examples](packages/gem-examples) | 一些 Gem 和 DuoyunUI 示例               |

## 贡献

Fork 项目，提交 PR
