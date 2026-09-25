# `<tap-radio>`

Radio and radio group. Used for selecting a single choice among a set of mutually exclusive options.

## Example

<gbp-example name="tap-radio" src="https://esm.sh/@mantou/tap-ui/elements/radio">

```json
[
  { "innerHTML": "Checked", "checked": true },
  { "innerHTML": "Unchecked", "checked": false },
  { "innerHTML": "Disabled", "disabled": true, "checked": true }
]
```

</gbp-example>

<gbp-example name="tap-radio-group" src="https://esm.sh/@mantou/tap-ui/elements/radio">

```json
{
  "heading": "Fruits",
  "value": "apple",
  "options": [
    { "label": "Apple", "value": "apple" },
    { "label": "Banana", "value": "banana", "description": "Yellow fruit" },
    { "label": "Orange", "value": "orange", "disabled": true }
  ],
  "@change": "(evt) => evt.currentTarget.value = evt.detail"
}
```

</gbp-example>

## `<tap-radio>` API

<gbp-api name="tap-radio" src="/src/elements/radio.ts"></gbp-api>

## `<tap-radio-group>` API

<gbp-api name="tap-radio-group" src="/src/elements/radio.ts"></gbp-api>
