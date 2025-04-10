# `<dy-meter>`

A component for displaying measurements within a known range. It can be used to show progress, usage levels, or any other metric that has a minimum and maximum value, with support for different layouts and color schemes.

## Example

<gbp-example name="dy-meter" direction="column" src="https://esm.sh/duoyun-ui/elements/meter">

```json
[
  {
    "value": 30,
    "label": "Label",
    "valueLabel": "30%",
    "layout": "flat"
  },
  {
    "max": 30,
    "value": 20,
    "color": "negative",
    "label": "Label",
    "valueLabel": "66%"
  }
]
```

</gbp-example>

## API

<gbp-api src="/src/elements/meter.ts"></gbp-api>
