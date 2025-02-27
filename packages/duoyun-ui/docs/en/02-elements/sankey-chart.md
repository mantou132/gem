# `<dy-sankey-chart>`

## Example

<gbp-example name="dy-sankey-chart" src="https://esm.sh/duoyun-ui/elements/sankey-chart">

```json
{
  "style": "width: 100%;",
  "aspectRatio": 3,
  "data": {
    "nodes": [
      { "id": "a", "label": "Node A" },
      { "id": "b", "label": "Node B" },
      { "id": "c", "label": "Node C" }
    ],
    "links": [
      { "source": "a", "target": "b", "value": 5 },
      { "source": "b", "target": "c", "value": 3 },
      { "source": "a", "target": "c", "value": 2 }
    ]
  }
}
```

</gbp-example>

## API

<gbp-api src="/src/elements/sankey-chart.ts"></gbp-api>
