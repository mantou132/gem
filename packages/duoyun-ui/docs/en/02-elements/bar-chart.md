# `<dy-bar-chart>`

Bar charts display data using rectangular bars of varying lengths. They are commonly used to compare quantities across different categories or to show changes over time.

## Example

<gbp-example name="dy-bar-chart" src="https://esm.sh/duoyun-ui/elements/bar-chart">

```json
{
  "style": "width: 100%;",
  "gutter": 0.05,
  "series": ["Series 1", "Series 2", "Series 3"],
  "sequences": [
    {
      "label": "Label",
      "values": [100, 190, 60]
    },
    {
      "label": "Label2",
      "values": [40, 130, 160]
    }
  ]
}
```

</gbp-example>

<gbp-example name="dy-bar-chart" src="https://esm.sh/duoyun-ui/elements/bar-chart">

```json
{
  "style": "width: 100%;",
  "stack": true,
  "series": ["Series 1", "Series 2", "Series 3"],
  "sequences": [
    {
      "label": "Label",
      "values": [100, 190, 60]
    },
    {
      "label": "Label2",
      "values": [40, 130, 160]
    }
  ]
}
```

</gbp-example>

## API

<gbp-api src="/src/elements/bar-chart.ts"></gbp-api>
