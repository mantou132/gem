# `<tap-pat-settings>`

Settings page. Pass `groups` to render groups and rows; no need to write `tap-cell-group` / `tap-cell` by hand. Configure row callbacks via item `onClick` / `onChange`.

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
          { "label": "Name", "description": "Mantou", "action": true, "onClick": "() => console.log('Name')" }
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
