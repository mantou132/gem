# `<tap-stepper>`

Stepper component. Based on number input, allows users to increase or decrease values by clicking or long-pressing plus/minus buttons, with min/max bounds, custom steps, floating-point precision, and direct input controls.

## Example

<gbp-example name="tap-stepper" src="https://esm.sh/@mantou/tap-ui/elements/stepper">

```json
[
  { "value": 1, "@change": "(evt) => (evt.target.value = evt.detail)" },
  { "value": 5, "min": 1, "max": 10, "step": 1, "@change": "(evt) => (evt.target.value = evt.detail)" },
  { "value": 0.5, "step": 0.1, "min": 0, "max": 1, "@change": "(evt) => (evt.target.value = evt.detail)" },
  { "value": 2, "disableinput": true, "@change": "(evt) => (evt.target.value = evt.detail)" },
  { "value": 1, "disabled": true }
]
```

</gbp-example>

## API

<gbp-api name="tap-stepper" src="/src/elements/stepper.ts"></gbp-api>
