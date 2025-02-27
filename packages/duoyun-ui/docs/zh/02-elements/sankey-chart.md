# `<dy-sankey-chart>`

## 例子

<gbp-example name="dy-sankey-chart" src="https://esm.sh/duoyun-ui/elements/sankey-chart">

```json
{
  "style": "width: 100%;",
  "aspectRatio": 3,
  "data": {
    "nodes": [
      { "id": "a", "label": "节点 A" },
      { "id": "b", "label": "节点 B" },
      { "id": "c", "label": "节点 C" }
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
