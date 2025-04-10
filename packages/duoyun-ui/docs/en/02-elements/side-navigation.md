# `<dy-side-navigation>`

A navigation component that displays a hierarchical menu structure on the side of a page. It supports nested items, groups, icons, and automatic collapsing when space is limited.

## Example

<gbp-example name="dy-side-navigation" src="https://esm.sh/duoyun-ui/elements/side-navigation">

```json
{
  "style": "width: 240px",
  "items": [
    { "title": "Page 1", "hash": "#1" },
    { "title": "Page 2", "hash": "#2" },
    { "title": "Page 3", "hash": "#3" },
    {
      "title": "Group 2",
      "group": [
        { "title": "Route 1", "hash": "#4" },
        { "title": "Route 2", "hash": "#5" },
        { "title": "Route 3", "hash": "#6" }
      ]
    }
  ]
}
```

</gbp-example>

## API

<gbp-api src="/src/elements/side-navigation.ts"></gbp-api>
