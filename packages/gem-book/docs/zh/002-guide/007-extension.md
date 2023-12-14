# 扩展

`<gem-book>` 渲染 Markdown，同时也扩展了 Markdown 语法。另外还提供一些方法让用户自定义 `<gem-book>`。

## Markdown 增强

### 代码块信息

语法：

```md
<语言>? <文件名>? <状态>? <高亮>?
```

下面是在 `<gbp-sandpack>` [插件](#plugins)中写代码块的例子：

<gbp-sandpack dependencies="@mantou/gem">

```js index.js
import { render } from '@mantou/gem';

render('这是一个 `<gbp-sandpack>` 例子', document.getElementById('root'));
```

````md README.md active 12-13
<gbp-sandpack dependencies="@mantou/gem">

```js index.js
import { render } from '@mantou/gem';

render('这是一个 `<gbp-sandpack>` 例子', document.getElementById('root'));
```

```md README.md active 3-4
# `<gbp-sandpack>`

- `<gbp-sandpack>` 中的代码块代表一个文件
- 默认第一个文件的状态为 `active`，如果手动指定状态，必须写文件名
```

</gbp-sandpack>
````

</gbp-sandpack>

_文件名只工作在 `<gbp-sandpack>` 中；高亮并非指代码语法高亮_

### 固定标题锚点 Hash {#fixed-hash}

默认会根据标题文本字段生成 hash，但有时你需要固定 hash，比如国际化时。

```md
### 固定标题锚 Hash {#fixed-hash}
```

### 高亮引用块

```md
> [!TIP]
> 这是[高亮引用块](https://github.com/orgs/community/discussions/16925)
```

> [!TIP]
> 这是[高亮引用块](https://github.com/orgs/community/discussions/16925)

支持 `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]` 和 `[!CAUTION]`。

## Parts

[Part](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/part) 能让你自定义 `<gem-book>` 的内部样式，例如：

```css
gem-book::part(homepage-hero) {
  background: #eee;
}
```

## 插槽

[插槽](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/slot)能让你自定义 `<gem-book>` 的内容，目前支持的插槽有 `sidebar-before`, `main-before`, `main-after`, `nav-inside`。

```html
<gem-book><div slot="sidebar-before">Hello</div></gem-book>
```

_可以使用 `--template` 指定模板文件_

## 插件 {#plugins}

### 使用插件

`<gem-book>` 使用自定义元素作为插件系统，他们可以自定义渲染 Markdown 内容或者增强 `<gem-book>` 的能力。下面是内置插件 `<gbp-raw>` 的使用方式。

引入插件：

<gbp-code-group>

```bash CLI
gem-book docs --plugin raw
```

```html HTML
<script type="module" src="https://unpkg.com/gem-book/plugins/raw.js"></script>
```

</gbp-code-group>

然后在 Markdown 中使用它来渲染仓库中的文件：

```md
<gbp-raw src="/src/plugins/raw.ts"></gbp-raw>
```

> [!TIP]
> 在 MarkDown 中使用插件时 Attribute 不应该换行，否则会作为内联元素被 `<p>` 标签打断。

有些插件需要配合插槽使用，比如内置插件 `<gbp-comment>`，它使用 [Gitalk](https://github.com/gitalk/gitalk) 为网站带来评论功能：

```html
<gem-book>
  <gbp-comment slot="main-after" client-id="xxx" client-secret="xxx"></gbp-comment>
</gem-book>
```

> [!NOTE]
> GemBook 内置插件支持自动导入，缺点是渲染文档后才会加载，有可能页面会闪烁。

### 开发插件

任意元素都可以作为插件，但如果你想像 `<gbp-raw>` 一样读取 `<gem-book>` 的数据，就需要使用 `GemBookPluginElement`, 他扩展自 [`GemElement`](https://gemjs.org/api/)，通过下面这种方式获取 `GemBookPluginElement` 和读取 `<gem-book>` 配置。

```js
customElements.whenDefined('gem-book').then(({ GemBookPluginElement }) => {
  customElements.define(
    'gbp-example',
    class extends GemBookPluginElement {
      constructor() {
        super();
        console.log(GemBookPluginElement.config);
      }
    },
  );
});
```
