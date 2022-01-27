# 扩展

`<gem-book>` 渲染 markdown，同时也扩展了 markdown 语法。另外还提供一些方法让用户自定义 `<gem-book>`。

## Markdown 增强

### 高亮代码行

_并非指编程语言的代码高亮_

````md 4-5
```md 3-4
# 标题

行 3
行 4
```
````

### 固定标题锚点 Hash {#fixed-hash}

默认会根据标题文本字段生成 hash，但有时你需要固定 hash，比如国际化时。

```md
### 固定标题锚 Hash {#fixed-hash}
```

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

## 插件

`<gem-book>` 使用自定义元素作为插件系统，他们可以自定义渲染 Markdown 内容或者增强 `<gem-book>` 的能力。下面是内置插件 `<gbp-raw>` 的使用方式。

引入插件：

```bash
gem-book docs --plugin raw
```

or

```html
<script type="module" src="https://unpkg.com/gem-book/plugins/raw.js"></script>
```

然后在 Markdown 中使用它来渲染仓库中的文件：

```md
<gbp-raw src="/src/plugins/raw.ts"></gbp-raw>
```

任意元素都可以作为插件，但如果你想像 `<gbp-raw>` 一样读取 `<gem-book>` 的数据，就需要使用 `GemBookPluginElement`, 他扩展自 [`GemElement`](https://gem.js.org/api/)，通过下面这种方式获取 `GemBookPluginElement` 和读取 `<gem-book>` 配置。

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

有些插件需要配合插槽使用，比如内置插件 `<gbp-comment>`，它使用 [Gitalk](https://github.com/gitalk/gitalk) 为网站带来评论功能：

```html
<gem-book>
  <gbp-comment slot="main-after" client-id="xxx" client-secret="xxx"></gbp-comment>
</gem-book>
```

_可以使用 `--template` 指定模板文件_
