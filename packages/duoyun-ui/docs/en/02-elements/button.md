# `<dy-button>`

Extends [`<tap-button>`](https://tap-ui.gemjs.org/en/elements/button) with a dropdown menu, see its docs for the full API.

## Example

<gbp-example name="dy-button" src="https://esm.sh/duoyun-ui/elements/button">

```json
[
  { "innerHTML": "Delete Post", "color": "danger" },
  {
    "innerHTML": "Create Post",
    "color": "danger",
    "type": "reverse",
    "dropdown": [{ "text": "Label 1" }, { "text": "Label 2" }]
  }
]
```

</gbp-example>

## API

<gbp-api src="/src/elements/button.ts"></gbp-api>
