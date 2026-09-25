# `<tap-stepper>`

步进器组件。基于数字输入框，通过点击或长按加减按钮增减数值，支持限制最大最小值、步长精度、禁用输入等。

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
