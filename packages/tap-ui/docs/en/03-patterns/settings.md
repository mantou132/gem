# `<tap-pat-settings>`

Settings page. Pass `groups` to render groups and rows; no need to write `tap-cell-group` / `tap-cell` by hand.

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
          { "label": "Name", "description": "Mantou", "action": true }
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
