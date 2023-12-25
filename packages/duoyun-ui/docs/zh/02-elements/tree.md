# `<dy-tree>`

## Example

<gbp-example name="dy-tree" src="https://esm.sh/duoyun-ui/elements/tree">

```json
{
  "style": "width: 300px",
  "highlights": ["Item 3.3.1"],
  "items": [
    { "label": "Item 1" },
    { "label": "Item 2" },
    {
      "label": "Item 3",
      "children": [
        { "label": "Item 3.1", "status": "notice" },
        { "label": "Item 3.2" },
        {
          "label": "Item 3.3",
          "children": [{ "label": "Item 3.3.1", "status": "negative", "tags": ["R", "C"] }]
        }
      ]
    },
    {
      "label": "Item 4",
      "childrenPlaceholder": "Loading..."
    },
    { "label": "Item 5", "children": [{ "label": "Item 5.1" }] }
  ],
  "@itemclick": "({detail, target}) => target.highlights = [detail.value]",
  "@expand": "async ({detail, target}) => {if (detail.label!='Item 4')return;await new Promise(r=>setTimeout(r, 1000));detail.children=Array(4).fill(null).map((_, i) => ({ label: `Item 4.${i + 1}` }));target.items=[...target.items]}"
}
```

</gbp-example>

## API

<gbp-api name="dy-tree" src="/src/elements/tree.ts"></gbp-api>
