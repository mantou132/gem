# `<dy-checkbox>`

## Example

<gbp-example name="dy-checkbox" src="https://jspm.dev/duoyun-ui/elements/checkbox">

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

<gbp-example
  name="dy-checkbox-group"
  props='{"orientation": "vertical", "options": [{"label": "Option 1"}, {"label": "Option 2"}, {"label": "Option 3"}], "value": ["Option 1"], "@change": "(evt) => evt.currentTarget.value = evt.detail"}'
  src="https://jspm.dev/duoyun-ui/elements/checkbox"></gbp-example>

## `<dy-checkbox>` API

<gbp-api name="dy-checkbox" src="/src/elements/checkbox.ts"></gbp-api>

## `<dy-checkbox-group>` API

<gbp-api name="dy-checkbox-group" src="/src/elements/checkbox.ts"></gbp-api>
