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

用于显示远端代码，如果提供的 `src` 只包含路径，则会从当前项目的 GitHub 上读取内容（受 [`sourceDir`](./002-cli.md#--source-dir)，[`sourceBranch`](./002-cli.md#--source-branch) 影响），例如：

<gbp-raw src="package.json" range="2-3,-4--6,author-license" highlight="-5,author"></gbp-raw>

```md
<!-- `range` 指定显示的范围，支持使用负数、字符串匹配，`highlight` 格式一样 -->

<gbp-raw src="package.json" range="2-3,-4--6,author-license" highlight="-5,author"></gbp-raw>
```

## `<gbp-var>`

引用全局变量：<gbp-var>hello</gbp-var>

```md
<gbp-var>hello</gbp-var>
```

变量需要在[配置文件](./002-cli.md)中定义。

## `<gbp-media>`

显示远端多媒体内容，比如图片，视频，获取资源方式和 `<gbp-raw>` 一样：

```md
<gbp-media src="preview.png"></gbp-media>
```

## `<gbp-include>`

动态加载 Markdown 片段：

<gbp-include src="./guide/007-extension.md" range="[!NOTE]->"></gbp-include>

```md
<!-- `range` 语法和 `<gbp-raw>` 一样，这里的 `range` 使用字符串匹配 -->

<gbp-include src="./guide/007-extension.md" range="[!NOTE]->"></gbp-include>
```

## `<gbp-import>`

动态导入模块，这可以用来按需加载插件，比如下面这个自定义元素是动态（`.ts` 文件会使用 [esm.sh](https://esm.sh/) 编译 ）加载的：

<gbp-import src="docs/hello.ts"></gbp-import>

<my-plugin-hello></my-plugin-hello>

```md
<gbp-import src="docs/hello.ts"></gbp-import>

<my-plugin-hello></my-plugin-hello>
```

## `<gbp-content>`

将内容插入 `<gem-book>`，这允许在特定页面自定义 `<gem-book>` 内容，例如自定义侧边栏：

```md
<gbp-content slot="sidebar-before">
  <div>Test</div>
  <style>
    gem-book [part=sidebar-content] {
      display: none;
    }
  </style>
</gbp-content>
```

## `<gbp-docsearch>`

使用 [Algolia DocSearch](https://docsearch.algolia.com/) 为网站提供搜索，只需要实例化一次，可以使用[插槽](./guide/007-extension.md#插槽)放在想要放置的位置：

<gbp-raw src="docs/template.html" range="13--4"></gbp-raw>

> [!WARNING]
>
> Algolia DocSearch Crawler [配置](https://crawler.algolia.com/admin/crawlers)中必须启用 `renderJavaScript`

使用 `docsearch?local` 可以提供本地搜索服务（感谢 [MiniSearch](https://github.com/lucaong/minisearch/)），[例子](https://duoyun-ui.gemjs.org)。

## `<gbp-comment>`

它使用 [Gitalk](https://github.com/gitalk/gitalk) 为网站带来评论功能，和 `<gbp-docsearch>` 类似的使用方式：

```html
<gem-book>
  <gbp-comment
    slot="main-after"
    client-id="xxx"
    client-secret="xxx"
  ></gbp-comment>
</gem-book>
```

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

## `<gbp-api>`

使用 [`gem-analyzer`](https://github.com/mantou132/gem/blob/main/packages/gem-analyzer) 为 `GemElement` 生成 API 文档，例如 [GemBookElement API](./004-api.md)；
