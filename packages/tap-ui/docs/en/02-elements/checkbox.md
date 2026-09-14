# `<tap-checkbox>`

Checkbox and Checkbox Group components. Used for multi-selection among options, supporting indeterminate state.

## Example

<gbp-example name="tap-checkbox" src="https://esm.sh/@mantou/tap-ui/elements/checkbox">

```json
[
  { "innerHTML": "Checked", "checked": true },
  { "innerHTML": "Unchecked", "checked": false },
  { "innerHTML": "Indeterminate", "indeterminate": true },
  { "innerHTML": "Disabled", "disabled": true, "checked": true }
]
```

</gbp-example>

<gbp-example name="tap-checkbox-group" src="https://esm.sh/@mantou/tap-ui/elements/checkbox">

```json
{
  "value": ["apple", "banana"],
  "options": [
    { "label": "Apple", "value": "apple" },
    { "label": "Banana", "value": "banana" },
    { "label": "Orange", "value": "orange" }
  ]
}
```

</gbp-example>

## `<tap-checkbox>` API

<gbp-api name="tap-checkbox" src="/src/elements/checkbox.ts"></gbp-api>

## `<tap-checkbox-group>` API

<gbp-api name="tap-checkbox-group" src="/src/elements/checkbox.ts"></gbp-api>
