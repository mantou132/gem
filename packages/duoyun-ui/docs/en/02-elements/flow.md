# `<dy-flow>`

## Example

<gbp-example name="dy-flow" src="https://esm.sh/duoyun-ui/elements/flow">

```json
{
  "style": "width: 100%",
  "graph": {
    "id": "root",
    "children": [
      { "id": "n1", "data": "Node 1" },
      { "id": "n2", "data": "Node 2" },
      { "id": "n3", "data": "Node 3" },
      { "id": "n4", "data": "Node 4" },
      { "id": "n5", "data": "Node 5" }
    ],
    "edges": [
      { "id": "e1", "sources": ["n1"], "targets": ["n2"] },
      { "id": "e2", "sources": ["n1"], "targets": ["n3"] },
      { "id": "e3", "sources": ["n1"], "targets": ["n4"] },
      { "id": "e4", "sources": ["n4"], "targets": ["n5"] }
    ]
  }
}
```

</gbp-example>

## API

<gbp-api src="/src/elements/flow.ts" name="dy-flow"></gbp-api>
