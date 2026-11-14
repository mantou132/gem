# `<tap-collapse>`

A collapsible content component that allows users to expand and collapse sections of content. It supports single or multiple panel expansion modes and includes search functionality for filtering content.

## Example

<gbp-example name="tap-collapse" src="https://esm.sh/@mantou/tap-ui/elements/collapse">

```json
{
  "style": "width: 100%",
  "searchable": true,
  "type": "single",
  "items": [
    {
      "summary": "Title 1",
      "detail": "This is collapse 1 panel"
    },
    {
      "summary": "Title 2",
      "detail": "This is collapse 2 panel"
    },
    {
      "summary": "Title 3",
      "detail": "This is collapse 3 panel"
    }
  ]
}
```

</gbp-example>

## `<tap-collapse>` API

<gbp-api name="tap-collapse" src="/src/elements/collapse.ts"></gbp-api>
