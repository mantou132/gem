# `<tap-tabbar>`

Bottom tab bar. Driven by `items` / `value`; emits `change` when selection changes.

## Example

<gbp-example name="tap-tabbar" src="https://esm.sh/tap-ui/elements/tabbar">

```json
{
  "value": "home",
  "items": [
    { "label": "Home", "value": "home", "icon": "icons.menu" },
    { "label": "Edit", "value": "edit", "icon": "icons.compose", "badge": 3 },
    { "label": "Settings", "path": "/settings", "pattern": "/settings", "icon": "icons.tune" },
    { "label": "More", "value": "more", "icon": "icons.close", "badge": true }
  ],
  "@change": "(evt) => (evt.target.value = evt.detail)"
}
```

</gbp-example>

Items with `path` / `route` render as `<tap-active-link>` and navigate via history. Other items use `value` and emit `change`.

## API

<gbp-api name="tap-tabbar" src="/src/elements/tabbar.ts"></gbp-api>
