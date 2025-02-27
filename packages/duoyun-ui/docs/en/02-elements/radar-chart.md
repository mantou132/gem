# `<dy-radar-chart>`

A radar chart (also known as spider or star chart) displays multivariate data in the form of a two-dimensional chart of three or more variables represented on axes starting from the same point.

## Example

<gbp-example name="dy-radar-chart" src="https://esm.sh/duoyun-ui/elements/radar-chart">

```json
{
  "style": "width: 100%;",
  "aspectRatio": 3,
  "dimensions": [
    { "label": "Sales", "max": 100 },
    { "label": "Marketing", "max": 100 },
    { "label": "Development", "max": 100 },
    { "label": "Customer Support", "max": 100 },
    { "label": "Administration", "max": 100 }
  ],
  "sequences": [
    {
      "label": "Department A",
      "values": [90, 85, 70, 95, 60]
    },
    {
      "label": "Department B",
      "values": [70, 95, 85, 65, 75]
    }
  ]
}
```

</gbp-example>

## API

<gbp-api src="/src/elements/radar-chart.ts"></gbp-api> 