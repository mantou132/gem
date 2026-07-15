# `<tap-cell>`

设置类列表行与分组。左侧主文案，右侧可为描述、开关或其他内容，`action` 显示右箭头。

## Example

<gbp-example name="tap-cell" src="https://esm.sh/tap-ui/elements/cell">

```json
{
  "label": "Name",
  "description": "馒头毫无营养",
  "action": true
}
```

</gbp-example>

<gbp-example name="tap-cell-group" src="https://esm.sh/tap-ui/elements/cell">

```json
{
  "heading": "Account",
  "items": [
    { "label": "Profile", "action": true },
    { "label": "Name", "description": "馒头毫无营养", "action": true },
    { "label": "Auto save photos", "checked": true }
  ],
  "@change": "({ target, detail }) => { detail.item.checked = detail.checked; target.items = [...target.items] }",
  "@itemclick": "({ detail }) => console.log(detail.label)"
}
```

</gbp-example>

## `<tap-cell>` API

<gbp-api name="tap-cell" src="/src/elements/cell.ts"></gbp-api>

## `<tap-cell-group>` API

<gbp-api name="tap-cell-group" src="/src/elements/cell.ts"></gbp-api>
