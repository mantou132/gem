---
isNav: true
navTitle: 指南
---

# 简介

GemBook 将 [Markdown](https://zh.wikipedia.org/wiki/Markdown) 内容渲染成网站，根据目录结构生成页面。GemBook 是为 [Gem](https://github.com/mantou132/gem) 创建的文档生成工具，其本身也是使用 Gem 编写，和 Gem 是共生关系，它使用自定义元素 `<gem-book>` 渲染内容。

## 快速开始

> [!WARNING] GemBook 依赖 [Node.js v18+](https://nodejs.org/)，请确保 `node -v` 命令能够执行

```bash
# 创建文档
mkdir docs && echo '# Hello <gem-book>!' > docs/readme.md

# 启动本地服务打开文档站，修改文档将自动刷新
npx gem-book docs

# 指定标题
npx gem-book docs -t MyApp

# 指定图标
npx gem-book docs -t MyApp -i logo.png

# 将 readme.md/index.md 渲染成项目首页
npx gem-book docs -t MyApp -i logo.png --home-mode

# 构建前端资源
npx gem-book docs -t MyApp -i logo.png --home-mode --build --output dist

```

更多参数和使用方法请查看[选项](./003-cli.md)。

<details>
<summary>

使用 `<gem-book>` 元素

</summary>

上面的命令使用 `webpack` 打包完整的前端项目，但你也可以直接在 HTML 中使用 `<gem-book>` 元素。

```bash
# 仅生成 <gem-book> 需要的 json 文件
npx gem-book docs -t MyApp -i logo.png --home-mode --build --json

# 安装成依赖
npm install gem-book
```

然后在你的项目中使用 `<gem-book>`：

```js
import { html, render } from '@mantou/gem';

// 导入 <gem-book>
import 'gem-book';

import config from './gem-book.json';

render(html`<gem-book .config=${config}></gem-book>`, document.body);
```

你可以在任何框架中使用 `<gem-book>` 元素。

</details>

## 目标

- 将文档构建成前端网站
- 提供 Plugin API 供用户扩展
- 导出 `<gem-book>` 元素供任何前端项目使用
- 解析目录，为 `<gem-book>` 生成渲染数据
