# `<dy-form>`

## Example

<gbp-example
  name="dy-form"
  props='{"style": "width: 100%;", "@change": "(evt) => {Object.keys(evt.detail).forEach(key => evt.target.querySelector(`[name=${key}]`).value = evt.detail[key])}"}'
  html='<dy-form-item name="name" label="Name" multiple></dy-form-item>
<dy-form-item name="password" label="password" type="password"></dy-form-item>
<dy-form-item name="email" label="Email" autofocus></dy-form-item>
<dy-form-item name="phone" label="Phone"></dy-form-item>
<dy-form-item name="date" label="Date" type="date" time></dy-form-item>
<dy-form-item name="range" label="Date Range" type="date-range" time></dy-form-item>'
  src="https://jspm.dev/duoyun-ui/elements/form"></gbp-example>

<gbp-example
  name="dy-form"
  props='{"style": "width: 100%;", "inline": true, "@change": "(evt) => {Object.keys(evt.detail).forEach(key => evt.target.querySelector(`[name=${key}]`).value = evt.detail[key])}"}'
  html='<dy-form-item name="name" label="Name" multiple></dy-form-item>
<dy-form-item name="email" label="Email"></dy-form-item>
<dy-form-item name="phone" label="Phone"></dy-form-item>'
  src="https://jspm.dev/duoyun-ui/elements/form"></gbp-example>

## `<dy-form>` API

<gbp-api name="dy-form" src="/src/elements/form.ts"></gbp-api>

## `<dy-form-item>` API

<gbp-api name="dy-form-item" src="/src/elements/form.ts"></gbp-api>
