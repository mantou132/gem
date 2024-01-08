# `<dy-select>`

## Example

<gbp-example name="dy-select" src="https://esm.sh/duoyun-ui/elements/select">

```json
[
  {
    "searchable": true,
    "multiple": true,
    "adder": { "text": "New" },
    "placeholder": "Please select!",
    "options": [{ "label": "Option 1" }, { "label": "Option 2" }],
    "@change": "(evt) => evt.target.value = evt.detail"
  },
  {
    "inline": true,
    "adder": { "text": "New" },
    "options": [{ "label": "Option 1" }, { "label": "Option 2" }],
    "@change": "(evt) => evt.target.value = evt.detail"
  }
]
```

</gbp-example>

## API

<gbp-api src="/src/elements/select.ts"></gbp-api>
