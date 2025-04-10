# `<dy-chart-zoom>`

A chart component that provides zooming functionality for data visualization. It allows users to select and focus on specific ranges of data, making it easier to analyze detailed sections of large datasets.

## Example

See [`<dy-area-chart>`](./area-chart.md)

<gbp-example name="dy-chart-zoom" src="https://esm.sh/duoyun-ui/elements/chart-zoom">

```json
{
  "style": "width: 100%",
  "aspectRatio": 5,
  "values": [
    [1, 8],
    [2, 2],
    [3, 6],
    [4, 7],
    [5, 5],
    [6, 3],
    [7, 4],
    [8, 1],
    [9, 9]
  ],
  "@change": "({ target, detail }) => target.value = detail",
  "value": [0, 1]
}
```

</gbp-example>

## API

<gbp-api src="/src/elements/chart-zoom.ts"></gbp-api>
