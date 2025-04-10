# `<dy-date-picker>`

A component that allows users to select a date or date-time from a calendar interface. It supports both date-only and date-time selection modes.

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

<gbp-example name="dy-date-panel" src="https://esm.sh/duoyun-ui/elements/date-panel">

```json
{
  "style": "width: 300px;"
}
```

</gbp-example>

## `<dy-date-panel>` API

<gbp-api src="/src/elements/date-panel.ts"></gbp-api>
