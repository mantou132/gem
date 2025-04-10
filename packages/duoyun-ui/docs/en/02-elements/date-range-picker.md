# `<dy-date-range-picker>`

A component that enables users to select a range of dates. It provides options for quick range selection and supports both date-only and date-time range selections.

## `<dy-date-range-picker>` Example

<gbp-example name="dy-date-range-picker" src="https://esm.sh/duoyun-ui/elements/date-range-picker">

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

## `<dy-date-range-picker>` API

<gbp-api src="/src/elements/date-range-picker.ts"></gbp-api>

## `<dy-date-range-panel>` Example

<gbp-example name="dy-date-range-panel" src="https://esm.sh/duoyun-ui/elements/date-range-panel">

```json
{
  "style": "width: 360px;"
}
```

</gbp-example>

## `<dy-date-range-panel>` API

<gbp-api src="/src/elements/date-range-panel.ts"></gbp-api>
