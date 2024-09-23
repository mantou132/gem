v1 只支持全局主题，v2 支持范围主题，并且支持主题覆盖：

```ts
// 全局主题将自动添加到 `document`
const theme = createTheme({ textColor: '#eee' });

const scopedTheme = createScopedTheme({ scopeTextColor: '#333' });

const overrideTheme = createOverrideTheme(theme, { textColor: '#eff' })

const styles = createCSSSheet(css`
  :scope {
    color: ${theme.textColor};
    background: ${scopedTheme.scopeTextColor};
  }
`);

@customElement('my-element')
@adoptedStyle(styles)
@adoptedStyle(scopedTheme)
@adoptedStyle(overrideTheme)
class MyElement extends GemElement {}
```

此外，得益于[相对颜色语法](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_colors/Relative_colors)，主题中以 `Color` 结尾的颜色直接支持使用“重量”（类似字重）调节亮度：`theme.textColor500`，这是一个比原 `textColor` 稍亮的颜色。
