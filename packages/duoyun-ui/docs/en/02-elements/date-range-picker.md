# `<dy-date-range-picker>`

## Example

<gbp-example name="dy-date-range-picker" src="https://jspm.dev/duoyun-ui/elements/date-range-picker">

```json
[
  {
    "value": [1644475003294, 1644575003294],
    "clearable": true,
    "quickRanges": [
      { "label": "Last Week", "value": "-1w" },
      { "label": "Last Month", "value": "-1M" }
    ],
    "@clear": "(evt) => evt.target.value = null",
    "@change": "(evt) => evt.target.value = evt.detail"
  }
]
```

</gbp-example>

## API

<gbp-api src="/src/elements/date-range-picker.ts"></gbp-api>
