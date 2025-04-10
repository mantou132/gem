# `<dy-slider>`

A slider component that allows users to select a value from a range by dragging a handle along a track. It supports both horizontal and vertical orientations, keyboard navigation, and optional editable input field.

## Example

<gbp-example name="dy-slider" direction="column" src="https://esm.sh/duoyun-ui/elements/slider">

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
