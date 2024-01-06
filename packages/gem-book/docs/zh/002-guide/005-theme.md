# 主题

`<gem-book>` 元素提供了主题的 API，可以非常方便的来自定义主题。

## 默认主题

<gbp-raw src="src/element/helper/default-theme.ts"></gbp-raw>

## 自定义主题

可以直接使用命令行参数提供 `JSON`/`CommonJS`/`ESM` 格式的主题文件路径或者[内置主题](https://github.com/mantou132/gem/tree/master/packages/gem-book/themes)名称：

```bash
gem-book docs --theme path/my-theme.mjs
gem-book docs --theme dark
```

当然，你也可以在直接使用 `<gem-book>` 的 DOM API 设置主题。

<gbp-code-group>

```js DOM
new GemBookElement(config, theme);
```

```js Lit
html`<gem-book .config=${config} .theme=${theme}></gem-book>`;
```

</gbp-code-group>
