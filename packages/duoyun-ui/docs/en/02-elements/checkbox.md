# `<dy-checkbox>`

## Example

<gbp-example name="dy-checkbox" src="https://esm.sh/duoyun-ui/elements/checkbox">

```json
[
  {
    "innerHTML": "Checkbox Label",
    "indeterminate": true,
    "checked": false,
    "@change": "(evt) => {evt.target.indeterminate = false;evt.target.checked = evt.detail;}"
  },
  {
    "innerHTML": "Checkbox Label",
    "disabled": true,
    "checked": true
  }
]
```

</gbp-example>

## `<dy-checkbox>` API

<gbp-api name="dy-checkbox" src="/src/elements/checkbox.ts"></gbp-api>

## `<dy-checkbox-group>` API

<gbp-api name="dy-checkbox-group" src="/src/elements/checkbox.ts"></gbp-api>
