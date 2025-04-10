# `<dy-radio>`

A radio button component that allows users to select a single option from a group of choices.

## Example

<gbp-example name="dy-radio-group" src="https://esm.sh/duoyun-ui/elements/radio">

```json
{
  "orientation": "vertical",
  "options": [
    {"label": "Option 1"},
    {"label": "Option 2"},
    {"label": "Option 3"}
  ],
  "value": "Option 1",
  "@change": "(evt) => evt.currentTarget.value = evt.detail"
}
```

</gbp-example>

## `<dy-radio>` API

<gbp-api name="dy-radio" src="/src/elements/radio.ts"></gbp-api>

## `<dy-radio-group>` API

<gbp-api name="dy-radio-group" src="/src/elements/radio.ts"></gbp-api>
