# `<tap-pat-settings>`

设置页。传入 `groups` 自动渲染分组与行，无需手写 `tap-cell-group` / `tap-cell`。

## Example

<gbp-example name="tap-pat-settings" src="https://esm.sh/tap-ui/patterns/settings">

```json
[
  {
    "groups": [
      {
        "items": [
          { "label": "Guardian Mode", "action": true },
          { "label": "Easy Mode", "action": true }
        ]
      },
      {
        "heading": "Account",
        "items": [
          { "label": "Profile", "action": true },
          { "label": "Name", "description": "馒头毫无营养", "action": true }
        ]
      },
      {
        "items": [{ "label": "Auto save photos", "checked": true }]
      }
    ],
    "@change": "({ target, detail }) => { detail.item.checked = detail.checked; target.groups = [...target.groups] }",
    "@itemclick": "({ detail }) => console.log(detail.label)"
  }
]
```

</gbp-example>

## API

<gbp-api name="tap-pat-settings" src="/src/patterns/settings.ts"></gbp-api>
