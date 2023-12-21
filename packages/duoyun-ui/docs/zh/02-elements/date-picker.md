# `<dy-date-picker>`

## Example

<gbp-example name="dy-date-picker" src="https://jspm.dev/duoyun-ui/elements/date-picker">

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

## API

<gbp-api src="/src/elements/date-picker.ts"></gbp-api>
