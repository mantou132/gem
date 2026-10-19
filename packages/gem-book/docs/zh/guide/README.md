---
isNav: true
navTitle: 指南
---

# 简介

GemBook 将 [Markdown](https://zh.wikipedia.org/wiki/Markdown) 内容渲染成网站，根据目录结构生成页面。
GemBook 是为 [Gem](https://github.com/mantou132/gem) 创建的文档站生成工具，其本身也是使用 Gem 编写，基于 [gemkit](https://github.com/mantou132/gem/tree/main/packages/gemkit)：
Markdown 在服务端渲染，构建时每个页面都预渲染成 HTML，浏览器接管页面后使用客户端导航。

## 快速开始

> [!WARNING]
> GemBook 依赖 [Node.js v22+](https://nodejs.org/)，请确保 `node -v` 命令能够执行

<gbp-include src="../snippets/start.md"></gbp-include>

更多参数和使用方法请查看[选项](../002-cli.md)。

## 目标

- 一条命令将 Markdown 内容构建成网站，不需要项目配置
- 不需要等待 JavaScript 加载就能看到内容，可以部署到任何静态托管服务
- 使用[自定义元素](../003-plugins.md)扩展 Markdown，例如可运行的示例和 API 文档
