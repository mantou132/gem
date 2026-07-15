# `<tap-tabbar>`

底部导航栏。通过 `items` / `value` 驱动，选中时触发 `change`。

## Example

<gbp-example name="tap-tabbar" src="https://esm.sh/tap-ui/elements/tabbar">

```json
{
  "value": "home",
  "items": [
    { "label": "Home", "value": "home", "icon": "icons.menu" },
    { "label": "Edit", "value": "edit", "icon": "icons.compose", "badge": 3 },
    { "label": "Link", "value": "link", "icon": "icons.link" },
    { "label": "More", "value": "more", "icon": "icons.close", "badge": true }
  ],
  "@change": "(evt) => (evt.target.value = evt.detail)"
}
```

</gbp-example>

## API

<gbp-api name="tap-tabbar" src="/src/elements/tabbar.ts"></gbp-api>
