# `<tap-select>`

Select dropdown component. Wraps the native `<select>` element directly as a controlled component. Supports options list, placeholders, and disabled state.

## Example

<gbp-example name="tap-select" src="https://esm.sh/@mantou/tap-ui/elements/select">

```json
[
  {
    "placeholder": "Please select...",
    "options": ["Option 1", "Option 2", "Option 3"],
    "@change": "(evt) => evt.target.value = evt.detail"
  },
  {
    "value": "2",
    "options": [
      { "label": "Option 1", "value": "1" },
      { "label": "Option 2", "value": "2" },
      { "label": "Option 3", "value": "3" }
    ],
    "@change": "(evt) => evt.target.value = evt.detail"
  },
  {
    "placeholder": "Disabled",
    "disabled": true,
    "options": ["Option 1", "Option 2"]
  }
]
```

</gbp-example>

## API

<gbp-api name="tap-select" src="/src/elements/select.ts"></gbp-api>
