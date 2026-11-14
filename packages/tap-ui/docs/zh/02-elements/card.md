# `<tap-card>`

可展开的卡片，点击展开到全屏，在顶部下拉关闭。
`expandable` 插槽只在展开后渲染，
默认插槽中的第一个元素在展开时作为卡片头部。

## Example

<gbp-example name="tap-card" src="https://esm.sh/@mantou/tap-ui/elements/card,https://esm.sh/@mantou/tap-ui/elements/content">

```json
{
  "style": "width: 300px;",
  "innerHTML": "<div style='padding: 1em; height: 120px; background: #6366f1; color: white'><h3>Build for touch</h3><p>Tap to expand</p></div><tap-content slot='expandable'><p>Detail content, pull down at the top to close.</p></tap-content>"
}
```

</gbp-example>

## API

<gbp-api name="tap-card" src="/src/elements/card.ts"></gbp-api>
