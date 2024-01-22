# `<dy-date-picker>`

## `<dy-date-picker>` Example

<gbp-example name="dy-date-picker" src="https://esm.sh/duoyun-ui/elements/date-picker">

```json
[
  {
    "value": 1644475003294,
    "placeholder": "Placeholder",
    "clearable": true,
    "@clear": "(evt) => evt.target.value = null",
    "@change": "(evt) => evt.target.value = evt.detail"
  },
  {
    "value": 1644475003294,
    "time": true,
    "clearable": true,
    "@clear": "(evt) => evt.target.value = null",
    "@change": "(evt) => evt.target.value = evt.detail"
  }
]
```

</gbp-example>

## `<dy-date-picker>` API

<gbp-api src="/src/elements/date-picker.ts"></gbp-api>

## `<dy-date-panel>` Example

<gbp-example
  name="dy-date-panel"
  props='{"style": "width: 300px;"}'
  src="https://esm.sh/duoyun-ui/elements/date-panel"></gbp-example>

## `<dy-date-panel>` API

<gbp-api src="/src/elements/date-panel.ts"></gbp-api>
