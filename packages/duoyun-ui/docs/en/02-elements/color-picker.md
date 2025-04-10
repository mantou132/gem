# `<dy-color-picker>`

A color selection component that provides a user-friendly interface for choosing colors. It supports both RGB and alpha channel selection, and includes an eyedropper tool for picking colors from the screen when available.

## `<dy-color-picker>` Example

<gbp-example name="dy-color-picker" src="https://esm.sh/duoyun-ui/elements/color-picker">

```json
[
  {
    "value": "#418eec",
    "disabled": true
  },
  {
    "alpha": true,
    "value": "#e5e",
    "@change": "(evt) => evt.target.value = evt.detail"
  }
]
```

</gbp-example>

## `<dy-color-picker>` API

<gbp-api src="/src/elements/color-picker.ts"></gbp-api>

## `<dy-color-panel>` Example

<gbp-example name="dy-color-panel" src="https://esm.sh/duoyun-ui/elements/color-panel">

```json
{
  "alpha": true,
  "value": "#e5e",
  "@change": "(evt) => evt.target.value = evt.detail"
}
```

</gbp-example>

## `<dy-color-panel>` API

<gbp-api src="/src/elements/color-panel.ts"></gbp-api>
