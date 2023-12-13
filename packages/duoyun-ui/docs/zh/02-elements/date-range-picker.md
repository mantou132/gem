# `<dy-date-range-picker>`

## Example

<gbp-example name="dy-date-range-picker" src="https://jspm.dev/duoyun-ui/elements/date-range-picker">

```json
[
  {
    "value": [1644475003294, 1644575003294],
    "clearable": true,
    "quickRanges": [
      { "label": "最近一周", "value": "-1w" },
      { "label": "最近一月", "value": "-1M" }
    ],
    "@clear": "(evt) => evt.target.value = null",
    "@change": "(evt) => evt.target.value = evt.detail"
  }
]
```

</gbp-example>

## API

<gbp-api src="/src/elements/date-range-picker.ts"></gbp-api>
