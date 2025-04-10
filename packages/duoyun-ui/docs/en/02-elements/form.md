# `<dy-form>`

A form component that provides a structured way to collect user input. It supports various form items like text input, password, email, phone, date picker, and date range picker. The form can be displayed in both standard and inline layouts.

## Example

<gbp-example name="dy-form" src="https://esm.sh/duoyun-ui/elements/form">

```json
{
  "style": "width: 100%;",
  "@change": "(evt) => {Object.keys(evt.detail).forEach(key => evt.target.querySelector(`[name=${key}]`).value = evt.detail[key])}",
  "innerHTML": "<dy-form-item name=\"name\" label=\"Name\" multiple></dy-form-item>\n<dy-form-item name=\"password\" label=\"Password\" type=\"password\"></dy-form-item>\n<dy-form-item name=\"email\" label=\"Email\" autofocus></dy-form-item>\n<dy-form-item name=\"phone\" label=\"Phone\"></dy-form-item>\n<dy-form-item name=\"date\" label=\"Date\" type=\"date-time\"></dy-form-item>\n<dy-form-item name=\"range\" label=\"Date Range\" type=\"date-range\"></dy-form-item>"
}
```

</gbp-example>

<gbp-example name="dy-form" src="https://esm.sh/duoyun-ui/elements/form">

```json
{
  "style": "width: 100%;",
  "inline": true,
  "@change": "(evt) => {Object.keys(evt.detail).forEach(key => evt.target.querySelector(`[name=${key}]`).value = evt.detail[key])}",
  "innerHTML": "<dy-form-item name=\"name\" label=\"Name\" multiple></dy-form-item>\n<dy-form-item name=\"email\" label=\"Email\"></dy-form-item>\n<dy-form-item name=\"phone\" label=\"Phone\"></dy-form-item>"
}
```

</gbp-example>

## `<dy-form>` API

<gbp-api name="dy-form" src="/src/elements/form.ts"></gbp-api>

## `<dy-form-item>` API

<gbp-api name="dy-form-item" src="/src/elements/form.ts"></gbp-api>
