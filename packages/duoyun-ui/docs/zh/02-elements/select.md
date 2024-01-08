# `<dy-select>`

## Example

<gbp-example name="dy-select" src="https://esm.sh/duoyun-ui/elements/select">

```json
[
  {
    "searchable": true,
    "multiple": true,
    "adder": { "text": "添加" },
    "placeholder": "请选择",
    "options": [{ "label": "Option 1" }, { "label": "Option 2" }],
    "@change": "(evt) => evt.target.value = evt.detail"
  },
  {
    "inline": true,
    "adder": { "text": "添加" },
    "options": [{ "label": "Option 1" }, { "label": "Option 2" }],
    "@change": "(evt) => evt.target.value = evt.detail"
  }
]
```

</gbp-example>

## API

<gbp-api src="/src/elements/select.ts"></gbp-api>
