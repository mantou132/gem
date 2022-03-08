# `<dy-form>`

## Example

<gbp-example
  name="dy-form"
  props='{"style": "width: 100%;", "@change": "(evt) => {evt.target.querySelector(\"[name=name]\").value = evt.detail.name}"}'
  html='<dy-form-item name="name" label="Name" multiple></dy-form-item>
<dy-form-item name="email" label="Email"></dy-form-item>
<dy-form-item name="phone" label="Phone"></dy-form-item>'
  src="https://jspm.dev/duoyun-ui/elements/form"></gbp-example>

<gbp-example
  name="dy-form"
  props='{"style": "width: 100%;", "inline": true, "@change": "(evt) => {evt.target.querySelector(\"[name=name]\").value = evt.detail.name}"}'
  html='<dy-form-item name="name" label="Name" multiple></dy-form-item>
<dy-form-item name="email" label="Email"></dy-form-item>
<dy-form-item name="phone" label="Phone"></dy-form-item>'
  src="https://jspm.dev/duoyun-ui/elements/form"></gbp-example>

## `<dy-form>` API

<gbp-api name="dy-form" src="/src/elements/form.ts"></gbp-api>

## `<dy-form-item>` API

<gbp-api name="dy-form-item" src="/src/elements/form.ts"></gbp-api>
