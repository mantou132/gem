---
isNav: true
---

# 官方插件

## `<gbp-code-group>`

用于显示几段相似功能的代码：

<gbp-code-group>

```bash npm
npm i gem-book
```

```bash pnpm
pnpm add gem-book
```

```bash yarn
yarn add gem-book
```

</gbp-code-group>

````md
<gbp-code-group>

```bash npm
npm i gem-book
```

```bash pnpm
pnpm add gem-book
```

```bash yarn
yarn add gem-book
```

</gbp-code-group>
````

## `<gbp-raw>`

构建时将文件的内容显示成代码块，`src` 是相对于当前文档（以 `.` 开头）或者当前工作目录的路径，或者网址，可以使用 [`importMap`](./002-cli.md#importmap) 映射前缀，例如：

<gbp-raw src="package.json" range="2-3,-4--6,author-license" highlight="-5,author"></gbp-raw>

```md
<!-- `range` 指定显示的范围，支持使用负数、字符串匹配，会显示行号，`highlight` 格式一样 -->

<gbp-raw src="package.json" range="2-3,-4--6,author-license" highlight="-5,author"></gbp-raw>
```

语言不是文件扩展名时使用 `codelang` 指定。

## `<gbp-var>`

引用全局变量：<gbp-var>hello</gbp-var>

```md
<gbp-var>hello</gbp-var>
```

变量需要在配置文件的 [`global`](./002-cli.md#global) 中定义。

## `<gbp-media>`

显示图片、视频或者音频，`src` 和 `<gbp-raw>` 一样，文档目录中的文件会和网站一起输出，其他文件使用仓库中的地址：

```md
<gbp-media src="preview.png" width="400"></gbp-media>
```

## `<gbp-include>`

动态加载 Markdown 片段：

<gbp-include src="./guide/007-extension.md" range="[!NOTE]->"></gbp-include>

```md
<!-- `range` 语法和 `<gbp-raw>` 一样，这里的 `range` 使用字符串匹配 -->

<gbp-include src="./guide/007-extension.md" range="[!NOTE]->"></gbp-include>
```

## `<gbp-import>`

显示页面时在客户端导入模块，`src` 和 `<gbp-raw>` 一样。本地文件和网站一起打包，使用网站的 `@mantou/gem`，其中导入的其他包从 [esm.sh](https://esm.sh/) 加载，版本在 `dependencies` 中指定，不需要安装。网址直接加载，`.ts` 文件会使用 esm.sh 编译：

<gbp-import height="20" name="my-plugin-hello" dependencies="canvas-confetti" src="docs/hello.ts"></gbp-import>

```md
<gbp-import height="20" name="my-plugin-hello" dependencies="canvas-confetti" src="docs/hello.ts"></gbp-import>
```

指定 `name` 将自动作为标签名插入到 `<gbp-import>` 后面，适合导入自定义元素场景。

## `<gbp-content>`

将内容插入[页面的区域](./guide/007-extension.md#slots)或者 `<head>`（没有 `slot` 时），这允许自定义特定页面：

```md
<gbp-content slot="sidebar-before">
  <div>Test</div>
</gbp-content>
```

## `<gbp-docsearch>`

使用 [Algolia DocSearch](https://docsearch.algolia.com/) 为网站提供搜索，显示在导航栏中，使用 [`docsearch`](./002-cli.md#docsearch) 配置：

```json
{
  "docsearch": {
    "appId": "xxx",
    "apiKey": "xxx",
    "indexName": "xxx"
  }
}
```

使用 `"docsearch": "local"` 可以提供本地搜索服务（感谢 [MiniSearch](https://github.com/lucaong/minisearch/)），索引在构建时生成，[例子](https://duoyun-ui.gemjs.org)。

## `<gbp-comment>`

它使用 [Gitalk](https://github.com/gitalk/gitalk) 为页面带来评论功能，显示在文档后面，使用 [`comment`](./002-cli.md#comment) 配置：

```json
{
  "comment": {
    "clientID": "xxx",
    "clientSecret": "xxx"
  }
}
```

仓库默认为 [`github`](./002-cli.md#github)，使用 `owner` 和 `repo` 指定。

## `<gbp-sandpack>`

使用 [Sandpack](https://sandpack.codesandbox.io/) 创建交互式示例：

<gbp-sandpack dependencies="@mantou/gem, duoyun-ui">

```ts
import { render, html } from '@mantou/gem';

import 'duoyun-ui/elements/button';

render(
  html`<dy-button>Time: ${new Date().toLocaleString()}</dy-button>`,
  document.getElementById('root'),
);
```

</gbp-sandpack>

````md
<gbp-sandpack dependencies="@mantou/gem, duoyun-ui">

```ts
import { render, html } from '@mantou/gem';

import 'duoyun-ui/elements/button';

render(
  html`<dy-button>Time: ${new Date().toLocaleString()}</dy-button>`,
  document.getElementById('root'),
);
```

</gbp-sandpack>
````

## `<gbp-example>`

为任何自定义元素生成示例，例如：

<gbp-example name="dy-avatar"  src="https://esm.sh/duoyun-ui/elements/avatar">

```json
{
  "src": "https://api.dicebear.com/5.x/bottts-neutral/svg",
  "status": "positive",
  "size": "large",
  "square": true
}
```

</gbp-example>

````md
<gbp-example name="dy-avatar"  src="https://esm.sh/duoyun-ui/elements/avatar">

```json
{
  "src": "https://api.dicebear.com/5.x/bottts-neutral/svg",
  "status": "positive",
  "size": "large",
  "square": true
}
```

</gbp-example>
````

代码块中可以使用数组来展示多个不同配置的元素。

## `<gbp-api>`

构建时使用 [`gem-analyzer`](https://github.com/mantou132/gem/tree/main/packages/gem-analyzer) 为 `GemElement` 生成 API 文档，标题会出现在目录中，例如 [`<gem-book-code>` API](./004-api.md#gem-book-code)：

```md
<!-- `name` 指定元素，没有时显示文件中的所有元素，没有元素时显示导出的成员 -->

<gbp-api name="gem-book-code" src="app/elements/code.ts"></gbp-api>
```

从包中导入的父类的 API 需要使用 [`importMap`](./002-cli.md#importmap) 找到源码。
