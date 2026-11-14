# `<tap-card>`

An expandable card. Tap it to expand to full screen, pull down at the top to close.
The `expandable` slot is only rendered when expanded,
and the first element in the default slot is treated as the card header during expansion.

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
