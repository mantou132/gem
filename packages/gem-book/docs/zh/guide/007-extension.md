# 扩展

## Markdown 增强

GemBook 在服务端使用 [`marked`](https://github.com/markedjs/marked) 渲染 Markdown，默认支持 [CommonMark](http://spec.commonmark.org/0.30/) 和 [GitHub Flavored Markdown](https://github.github.com/gfm/)，GemBook 扩展了 Markdown 语法。

### 代码块信息

````md
```<语言>? <文件名>? <状态>? <高亮>?
...
```
````

- `语言`：[语法高亮](https://highlightjs.org/)的语言，构建时高亮
- `文件名`：显示在代码上方，也是 [`<gbp-code-group>`](../003-plugins.md#gbp-code-group) 的标签名和 [`<gbp-sandpack>`](../003-plugins.md#gbp-sandpack) 的文件名
- `状态`：在代码组中，`active` 默认显示，`hidden` 不显示在标签中
- `高亮`：高亮的行，例如 `1,3-5`，负数从末尾计算

例如使用高亮：

````md 1
# 代码块信息

```md 1
# 代码块信息
```
````

### 固定标题锚点 Hash {#fixed-hash}

默认会根据标题文本字段生成 hash，但有时你需要固定 hash，比如国际化时。

```md
### 固定标题锚 Hash {#fixed-hash}
```

### 高亮引用块

```md
> [!NOTE]
> 这是 [高亮引用块](https://github.com/orgs/community/discussions/16925)
```

> [!NOTE]
> 这是 `[!NOTE]`

> [!TIP]
> 这是 `[!TIP]`

> [!IMPORTANT]
> 这是 `[!IMPORTANT]`

> [!WARNING]
> 这是 `[!WARNING]`

> [!CAUTION]
> 这是 `[!CAUTION]`

## 页面区域 {#slots}

在文档中使用 [`<gbp-content>`](../003-plugins.md#gbp-content) 可以将内容插入到页面的区域中，离开页面时移除：

- `nav-inside`：导航栏中
- `sidebar-before`：侧边栏顶部
- `main-before`：文档前面
- `main-after`：文档后面

```md
<gbp-content slot="main-before">
  <p>该文档已废弃。</p>
</gbp-content>
```

## 插件 {#plugins}

GemBook 使用自定义元素作为插件系统，[内置插件](../003-plugins.md)可以直接在 Markdown 中使用，例如：

```md
<gbp-raw src="package.json"></gbp-raw>
```

部分插件在构建时由服务端渲染（例如 `<gbp-raw>`、`<gbp-include>`、`<gbp-api>`），不会在浏览器中加载任何代码，
其他插件由服务端渲染，在浏览器中工作（例如 `<gbp-code-group>`、`<gbp-sandpack>`）。

> [!TIP]
>
> 1. 插件的开始标签写在一行中，否则 Markdown 可能把它当成文本
> 2. VSCode 默认不能在 Markdown 文件中使用 [Emmet](https://code.visualstudio.com/docs/editor/emmet)，可以通过设置开启：
>
>    ```json
>    "emmet.excludeLanguages": [],
>    "emmet.includeLanguages": {"markdown": "html"},
>    ```

### 自定义元素 {#custom-elements}

使用自定义元素编写你自己的插件，例如使用 [Gem](https://gemjs.org)：

<gbp-raw src="docs/hello.ts"></gbp-raw>

使用 [`<gbp-import>`](../003-plugins.md#gbp-import) 只在使用它的页面加载：

```md
<gbp-import name="my-plugin-hello" dependencies="canvas-confetti" src="docs/hello.ts"></gbp-import>
```

或者添加到配置文件的 [`plugins`](../002-cli.md#plugins) 作为全站插件，它和网站一起打包，依赖安装在项目中，然后在任意文档中直接使用该元素，Gem 元素也会在服务端渲染：

```md
<my-plugin-hello></my-plugin-hello>
```

### 插件 API {#plugin-api}

打包的插件（全站插件和本地的 [`<gbp-import>`](../003-plugins.md#gbp-import) 模块）可以导入 `gem-book/plugin`，项目中没有安装 `gem-book` 时也可以使用（例如使用 `npx`）：

```ts
import { adoptedStyle, connectStore, css, customElement, GemElement, html, template } from '@mantou/gem';
import { bookStore, getGlobal, theme } from 'gem-book/plugin';

const style = css`
  :scope {
    color: ${theme.primaryColor};
  }
`;

@customElement('my-page-info')
@adoptedStyle(style)
@connectStore(bookStore)
export class MyPageInfoElement extends GemElement {
  @template()
  #content = () => html`${bookStore.doc?.title} (${bookStore.lang}) v${getGlobal('version')}`;
}
```

- `bookStore`：网站和当前页面的数据，服务端渲染时也可以使用，切换页面时更新
  - `config`：网站配置
  - `lang`：当前语言
  - `path`：当前页面的路径，不包括语言前缀，例如 `/v1/guide`
  - `version`：当前页面所在的旧版本，最新版本为空
  - `site`：网站的导航和侧边栏，包括旧版本的
  - `doc`：当前文档（标题、目录等），其他页面（例如 404）为空
- `theme`：主题的 [CSS 变量](./005-theme.md#css-variables)，例如 `theme.primaryColor`
- `getGlobal(name)`：[`global`](../002-cli.md#global) 中的值，`name` 可以是路径，例如 `pkg.version`
- `htmlTemplate(html)`：将 HTML 字符串作为模版渲染，其中的自定义元素也会在服务端渲染

`gem-book/plugin/server` 用于只在服务端执行的代码，例如使用 `@server()` 的[服务端元素](https://github.com/mantou132/gem/tree/main/packages/gem-ssr#server-elements)，当前文档是当前页面的文档：

```ts
import fs from 'node:fs';

import { createState, customElement, GemElement, html, mounted, template } from '@mantou/gem';
import { server } from '@mantou/gemkit';
import { htmlTemplate } from 'gem-book/plugin';
import { renderMarkdown, resolveSrc } from 'gem-book/plugin/server';

// 只输出 HTML，浏览器中不会加载代码
@customElement('my-changelog')
@server()
export class MyChangelogElement extends GemElement {
  #state = createState({ html: '' });

  @server()
  @mounted()
  #init = async () => {
    const resolved = resolveSrc(this.getAttribute('src') || '');
    if ('file' in resolved) this.#state({ html: await renderMarkdown(fs.readFileSync(resolved.file, 'utf8')) });
  };

  @template()
  #content = () => htmlTemplate(this.#state.html);
}
```

- `resolveSrc(src)`：和内置插件一样解析 `src`：网址，相对于当前文档（`.` 开头）或者当前工作目录的文件，支持 [`importMap`](../002-cli.md#importmap)
- `renderMarkdown(md)`：和文档一样渲染 Markdown（代码高亮、相对链接、服务端插件），返回 HTML
- `getGlobal(name)`：同上
