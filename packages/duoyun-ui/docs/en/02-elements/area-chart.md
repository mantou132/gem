# `<dy-area-chart>`

Area charts are used to represent quantitative variations over a period of time. They are similar to line charts but with the area below the line filled in with color. This can be useful for showing cumulative totals or emphasizing volume.

## Example

<gbp-example name="dy-area-chart" src="https://esm.sh/duoyun-ui/elements/area-chart">

```json
{
  "style": "width: 100%;",
  "fill": true,
  "aspectRatio": 4,
  "smooth": true,
  "chartZoom": true,
  "yMax": 10,
  "xAxi": { "formatter": "(value) => value.toFixed(2)" },
  "yAxi": { "formatter": "(value) => value.toFixed(1)" },
  "@zoom": "(e) => e.target.range = e.detail",
  "sequences": [
    {
      "label": "Label",
      "values": [
        [10, 3],
        [15, 3],
        [20, 5],
        [25, 4],
        [30, 8],
        [35, 5],
        [40, 4],
        [45, 5],
        [50, 1],
        [55, 3],
        [60, 8],
        [65, 5],
        [70, 6]
      ]
    }
  ]
}
```

</gbp-example>

## API

<gbp-api src="/src/elements/area-chart.ts"></gbp-api>
