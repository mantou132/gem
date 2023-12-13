# `<dy-slider>`

## Example

<gbp-example name="dy-slider" direction="column" src="https://jspm.dev/duoyun-ui/elements/slider">

```json
[
  {
    "value": 20,
    "step": 2,
    "editable": true,
    "@change": "(evt) => evt.target.value = evt.detail"
  },
  {
    "value": 20,
    "max": 50,
    "step": 5,
    "editable": true,
    "orientation": "vertical",
    "@change": "(evt) => evt.target.value = evt.detail"
  }
]
```

</gbp-example>

## API

<gbp-api src="/src/elements/slider.ts"></gbp-api>
