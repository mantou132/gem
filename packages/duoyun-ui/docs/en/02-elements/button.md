# `<dy-button>`

## Example

<gbp-example name="dy-button" src="https://esm.sh/duoyun-ui/elements/button">

```json
[
  { "innerHTML": "Delete Post", "color": "danger" },
  { "innerHTML": "Create Post", "color": "danger", "disabled": true },
  {
    "innerHTML": "Create Post",
    "color": "danger",
    "type": "reverse",
    "dropdown": [{ "text": "Label 1" }, { "text": "Label 2" }]
  },
  {
    "icon": "icons.add",
    "color": "informative",
    "square": true,
    "round": true
  }
]
```

</gbp-example>

## API

<gbp-api src="/src/elements/button.ts"></gbp-api>
