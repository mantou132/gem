# `<tap-date-picker>`

日期时间选择器。包装原生 `<input type="date">` 等输入框，点击后弹出系统自带的选择器，为受控组件。`value` 使用原生格式，显示文本根据当前语言格式化。

## Example

<gbp-example name="tap-date-picker" src="https://esm.sh/@mantou/tap-ui/elements/date-picker">

```json
[
  {
    "placeholder": "选择日期",
    "clearable": true,
    "@change": "(evt) => evt.target.value = evt.detail"
  },
  {
    "type": "time",
    "value": "09:00",
    "@change": "(evt) => evt.target.value = evt.detail"
  },
  {
    "type": "datetime",
    "placeholder": "选择日期时间",
    "@change": "(evt) => evt.target.value = evt.detail"
  },
  {
    "type": "month",
    "value": "2026-11",
    "@change": "(evt) => evt.target.value = evt.detail"
  },
  {
    "placeholder": "已禁用",
    "disabled": true
  }
]
```

</gbp-example>

## 约束

`min`、`max`、`step` 会传递给原生输入框，但部分平台（如 iOS）的选择器不会遵守，提交时需要自行校验。

## API

<gbp-api name="tap-date-picker" src="/src/elements/date-picker.ts"></gbp-api>
