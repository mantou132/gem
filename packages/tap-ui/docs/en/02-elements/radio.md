# `<tap-radio>`

Radio and Radio Group components. Used for mutually exclusive single option selection.

## Example

<gbp-example name="tap-radio" src="https://esm.sh/@mantou/tap-ui/elements/radio">

```json
[
  { "innerHTML": "Selected", "checked": true },
  { "innerHTML": "Unselected", "checked": false },
  { "innerHTML": "Disabled", "disabled": true, "checked": true }
]
```

</gbp-example>

<gbp-example name="tap-radio-group" src="https://esm.sh/@mantou/tap-ui/elements/radio">

```json
{
  "value": "apple",
  "options": [
    { "label": "Apple", "value": "apple" },
    { "label": "Banana", "value": "banana" },
    { "label": "Orange", "value": "orange" }
  ]
}
```

</gbp-example>

## `<tap-radio>` API

<gbp-api name="tap-radio" src="/src/elements/radio.ts"></gbp-api>

## `<tap-radio-group>` API

<gbp-api name="tap-radio-group" src="/src/elements/radio.ts"></gbp-api>
