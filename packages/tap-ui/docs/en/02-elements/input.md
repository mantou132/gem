# `<tap-input>`

Text input component. Supports clear button, various input types (password, number, textarea, etc.), and disabled state.

## Example

<gbp-example name="tap-input" src="https://esm.sh/@mantou/tap-ui/elements/input">

```json
[
  { "placeholder": "Please enter text...", "clearable": true },
  { "type": "password", "placeholder": "Please enter password...", "value": "123456", "clearable": true },
  { "type": "textarea", "placeholder": "Multi-line text input...", "rows": 3 },
  { "placeholder": "Disabled input", "disabled": true, "value": "Disabled" }
]
```

</gbp-example>

## API

<gbp-api name="tap-input" src="/src/elements/input.ts"></gbp-api>
