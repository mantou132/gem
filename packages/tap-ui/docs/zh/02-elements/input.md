# `<tap-input>`

文本输入框组件。支持清除按钮、各种输入类型（密码、数字、多行文本等）以及禁用状态。

## Example

<gbp-example name="tap-input" src="https://esm.sh/@mantou/tap-ui/elements/input">

```json
[
  { "placeholder": "请输入文本...", "clearable": true },
  { "type": "password", "placeholder": "请输入密码...", "value": "123456", "clearable": true },
  { "type": "textarea", "placeholder": "多行文本输入...", "rows": 3 },
  { "placeholder": "禁用输入框", "disabled": true, "value": "已禁用" }
]
```

</gbp-example>

## API

<gbp-api name="tap-input" src="/src/elements/input.ts"></gbp-api>
