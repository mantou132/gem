# 主题

网站的颜色、字体和尺寸等由主题定义。

## 默认主题

<gbp-raw src="app/lib/default-theme.ts" range="1--4"></gbp-raw>

## 自定义主题

使用配置 [`theme`](../002-cli.md#theme) 提供[内置主题](https://github.com/mantou132/gem/tree/main/packages/gem-book/themes)的名称，
或者 `JSON` 格式的主题文件、默认导出主题的模块的路径，主题只需要包含要修改的值：

```json
{
  "theme": "dark"
}
```

<gbp-raw src="themes/dark.js"></gbp-raw>

## CSS 变量 {#css-variables}

主题以 CSS 变量的形式定义在 `:root` 上，例如 `primaryColor` 是 `--gem-book-primary-color`，
也可以在特定页面中使用 CSS 修改它们，例如使用 [`<gbp-content>`](../003-plugins.md#gbp-content)：

```md
<gbp-content>
  <style>
    :root {
      --gem-book-primary-color: tomato;
    }
  </style>
</gbp-content>
```
