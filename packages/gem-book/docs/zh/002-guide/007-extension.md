# 扩展

GemBook 使用 [`marked`](https://github.com/markedjs/marked) 渲染 Markdown，默认支持 [CommonMark](http://spec.commonmark.org/0.30/) 和 [GitHub Flavored Markdown](https://github.github.com/gfm/)，GemBook 扩展了 Markdown 语法，另外还提供一些方法让用户自定义 GemBook。

## Markdown 增强

### 代码块信息

````md
```<语言>? <文件名>? <状态>? <高亮>?
...
```
````

例如使用高亮：

````md 1
# 代码块信息

```md 1
# 代码块信息

...
```
````

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

## 插槽

[插槽](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/slot)能让你自定义 `<gem-book>` 的内容，目前支持的插槽有 `sidebar-before`, `main-before`, `main-after`, `nav-inside`, `logo-after`。

<gbp-raw src="docs/template.html" range="8--4"></gbp-raw>

> [!NOTE]
> 使用 `--template` 指定模板文件才能使用插槽

## 插件 {#plugins}

### 使用插件

GemBook 使用自定义元素作为插件系统，他们可以自定义渲染 Markdown 内容或者增强 GemBook 的能力。下面是内置插件 `<gbp-raw>` 的使用方式：

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

在[这里](../003-plugins.md)查看所有内置插件。

> [!TIP]
> 在 Markdown 中使用插件时 Attribute 不应该换行，否则会作为内联元素被 `<p>` 标签打断。
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
