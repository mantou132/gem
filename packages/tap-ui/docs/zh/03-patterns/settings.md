# `<tap-pat-settings>`

设置页。传入 `groups` 自动渲染分组与行，无需手写 `tap-cell-group` / `tap-cell`。行回调写在 item 的 `onClick` / `onChange` 上。

## Example

<gbp-example name="tap-pat-settings" src="https://esm.sh/tap-ui/patterns/settings">

```json
[
  {
    "groups": [
      {
        "items": [
          { "label": "Guardian Mode", "action": true, "onClick": "() => console.log('Guardian Mode')" },
          { "label": "Easy Mode", "action": true, "onClick": "() => console.log('Easy Mode')" }
        ]
      },
      {
        "heading": "Account",
        "items": [
          { "label": "Profile", "action": true, "onClick": "() => console.log('Profile')" },
          { "label": "Name", "description": "馒头毫无营养", "action": true, "onClick": "() => console.log('Name')" }
        ]
      },
      {
        "items": [
          {
            "label": "Auto save photos",
            "checked": true,
            "onChange": "(checked) => { const el = document.querySelector('gbp-example[name=tap-pat-settings]').shadowRoot.querySelector('tap-pat-settings'); const item = el.groups.flatMap((g) => g.items).find((i) => i.label === 'Auto save photos'); item.checked = checked; el.groups = [...el.groups] }"
          }
        ]
      }
    ]
  }
]
```

</gbp-example>

## API

<gbp-api name="tap-pat-settings" src="/src/patterns/settings.ts"></gbp-api>
