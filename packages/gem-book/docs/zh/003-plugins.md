---
isNav: true
---

# 内置插件

## `<gbp-code-group>`

用于显示几段相似的代码：

<gbp-code-group>

```bash NPM
npm i gem-book
```

```bash YARN
yarn add gem-book
```

</gbp-code-group>

````md
<gbp-code-group>

```bash NPM
npm i gem-book
```

```bash YARN
yarn add gem-book
```

</gbp-code-group>
````

## `<gbp-raw>`

用于显示远端代码，如果提供的 `src` 只包含路径，则会从当前项目的 GitHub 上读取内容（受 [`sourceDir`](./002-guide/003-cli.md#--source-dir)，[`sourceBranch`](./002-guide/003-cli.md#--source-branch) 影响），比如：

<gbp-raw src="package.json" range="2-3,-6--4"><gbp-raw>

```md
<!-- `range` 指定显示的范围，支持使用负数 -->

<gbp-raw src="package.json" range="2-3,-6--4"><gbp-raw>
```

## `<gbp-media>`

显示远端多媒体内容，比如图片，视频，获取资源方式和 `<gbp-raw>` 一样：

```md
<gbp-media src="/preview.png"></gbp-media>
```

## `<gbp-docsearch>`

使用 [DocSearch](https://docsearch.algolia.com/) 为网站提供搜索，只需要实例化一次，可以使用[插槽](./002-guide/007-extension.md#插槽)放在想要放置的位置：

<gbp-raw src="docs/template.html" range="13--6,-4"></gbp-raw>

> [!WARNING]
> DocSearch 以前[不支持](https://github.com/algolia/renderscript/pull/555) ShadowDOM，需要使用自定义抓取器抓取内容，不知道现在有没有更改

## `<gbp-comment>`

它使用 [Gitalk](https://github.com/gitalk/gitalk) 为网站带来评论功能，和 `<gbp-docsearch>` 类似的使用方式：

```html
<gem-book>
  <gbp-comment slot="main-after" client-id="xxx" client-secret="xxx"></gbp-comment>
</gem-book>
```

## `<gbp-sandpack>`

使用 [Sandpack](https://sandpack.codesandbox.io/) 创建交互式示例：

<gbp-sandpack dependencies="@mantou/gem, duoyun-ui">

```ts
import { render, html } from '@mantou/gem';

import 'duoyun-ui/elements/button';

render(html`<dy-button>Time: ${new Date().toLocaleString()}</dy-button>`, document.getElementById('root'));
```

</gbp-sandpack>

````md
<gbp-sandpack dependencies="@mantou/gem, duoyun-ui">

```ts
import { render, html } from '@mantou/gem';

import 'duoyun-ui/elements/button';

render(html`<dy-button>Time: ${new Date().toLocaleString()}</dy-button>`, document.getElementById('root'));
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
