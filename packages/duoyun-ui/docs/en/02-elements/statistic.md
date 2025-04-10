# `<dy-statistic>`

A component for displaying statistical data with support for various data types including bandwidth, traffic, decimal numbers, percentages, durations, and currency. It can show trends by comparing current and previous values, and supports customizable icons and loading states.

## Example

<gbp-example name="dy-statistic" src="https://esm.sh/duoyun-ui/elements/statistic">

```json
[
  {
    "style": "width: 200px; border: 1px solid; border-radius: 4px; padding: 1em;",
    "type": "traffic",
    "icon": "icons.forward",
    "text": "Saving",
    "value": 12000,
    "prevValue": 9000
  },
  {
    "style": "width: 200px; border: 1px solid; border-radius: 4px; padding: 1em;",
    "type": "duration",
    "text": "Delay",
    "neutral": "negative",
    "value": 12,
    "prevValue": 9
  }
]
```

</gbp-example>

## API

<gbp-api src="/src/elements/statistic.ts"></gbp-api>
