# 主题

`<gem-book>` 元素提供了主题的 API，可以非常方便的来自定义主题。

## 默认主题

<gbp-raw src="src/element/helper/default-theme.ts"></gbp-raw>

## 自定义主题

可以直接使用命令行参数提供 `json`/`CommonJs` 格式的主题文件路径或者[内置主题](https://github.com/mantou132/gem-book/tree/master/themes)名称：

```bash
gem-book docs --theme my-theme
gem-book docs --theme dark
```

当然，你也可以在直接使用 `<gem-book>` 的 DOM API 设置主题。

```js
new GemBookElement(config, theme);
```

或者

```js
html`<gem-book .config=${config} .theme=${theme}></gem-book>`;
```
