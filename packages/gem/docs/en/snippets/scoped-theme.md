v1 only supports global themes, while v2 supports scoped themes and theme overrides:

```ts
// Global theme will be automatically added to `document`
const [theme] = useTheme({ textColor: '#eee' });

const [scopedTheme] = useScopedTheme({ scopeTextColor: '#333' });

const [overrideTheme] = overrideTheme(theme, { textColor: '#eff' });

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

Additionally, thanks to [relative color syntax](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_colors/Relative_colors), colors ending with `Color` in the theme directly support using "weights" (similar to font weight) to adjust brightness: `theme.textColor500`, which is a color slightly brighter than the original `textColor`.