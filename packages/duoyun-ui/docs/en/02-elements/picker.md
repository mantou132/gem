# `<dy-picker>`

## Example

<gbp-example name="dy-picker" direction="column" src="https://esm.sh/duoyun-ui/elements/picker">

```json
[
  {
    "value": "Option 1",
    "options": [{ "label": "Option 1" }, { "label": "Option 2" }],
    "@change": "(evt) => evt.target.value = evt.detail"
  },
  {
    "placeholder": "Select Option",
    "borderless": true,
    "multiple": true,
    "options": [
      { "label": "Option 1" },
      { "label": "Option 2", "children": [{ "label": "Option 3" }] }
    ],
    "@change": "(evt) => evt.target.value = evt.detail"
  }
]
```

</gbp-example>

## API

<gbp-api src="/src/elements/picker.ts"></gbp-api>
