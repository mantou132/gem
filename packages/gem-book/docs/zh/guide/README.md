---
isNav: true
navTitle: 指南
---

# 简介

GemBook 将 [Markdown](https://zh.wikipedia.org/wiki/Markdown) 内容渲染成网站，根据目录结构生成页面。
GemBook 是为 [Gem](https://github.com/mantou132/gem) 创建的文档站生成工具，其本身也是使用 Gem 编写，和 Gem 是共生关系，它使用自定义元素 `<gem-book>` 渲染内容。

## 快速开始

可以直接在 [StackBlitz](https://stackblitz.com/edit/node-c7iw5d?file=README.md) 上进行在线尝试。

> [!WARNING] GemBook 依赖 [Node.js v18+](https://nodejs.org/)，请确保 `node -v` 命令能够执行

<gbp-include src="../snippets/start.md"></gbp-include>

更多参数和使用方法请查看[选项](../002-cli.md)。

<details>
<summary>

使用 `<gem-book>` 元素

</summary>

上面的命令使用 `webpack` 构建完整的前端资源，但你也可以直接在 HTML 中使用 `<gem-book>` 元素。

```bash
# 安装成依赖
npm install gem-book

# 仅生成 <gem-book> 需要的 json 文件
npx gem-book docs -t MyApp -i logo.png --home-mode --build --json
```

然后在你的项目中使用 `<gem-book>`：

```js
import { html, render } from '@mantou/gem';
import 'gem-book';

import config from './gem-book.json';

render(html`<gem-book .config=${config}></gem-book>`, document.body);
```

你可以在任何前端项目中使用 `<gem-book>` 元素。

</details>

## 目标

- 一条命令将 Markdown 内容构建成网站
- 提供稳定的 Plugin API 供用户扩展
- 导出 `<gem-book>` 元素供任何前端项目使用
- 解析目录，为 `<gem-book>` 生成 `json` 格式的渲染数据
