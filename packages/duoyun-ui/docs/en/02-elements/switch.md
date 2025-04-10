# `<dy-switch>`

A switch component that allows users to toggle between two states. It provides visual feedback and can be customized with different colors based on semantic meanings.

## Example

<gbp-example name="dy-switch" src="https://esm.sh/duoyun-ui/elements/switch">

```json
[
  {
    "innerHTML": "WIFI",
    "neutral": "informative",
    "checked": true,
    "@change": "(evt) => evt.target.checked = evt.detail"
  },
  {
    "innerHTML": "Data Saving Mode",
    "neutral": "informative",
    "checked": true,
    "disabled": true
  }
]
```

</gbp-example>

## API

<gbp-api src="/src/elements/switch.ts"></gbp-api>
