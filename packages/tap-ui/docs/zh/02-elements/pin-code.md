# `<tap-pin-code>`

PIN 码 / 验证码（OTP）输入组件。专为移动端设计的定长字符分格输入框，支持短信验证码、动态令牌、支付密码等场景，内置透明 Input 层支持原生移动端输入、短信自动填充与掩码模式。

## Example

<gbp-example name="tap-pin-code" src="https://esm.sh/@mantou/tap-ui/elements/pin-code">

```json
[
  { "length": 6, "@change": "(evt) => (evt.target.value = evt.detail)" },
  { "length": 4, "mask": true, "@change": "(evt) => (evt.target.value = evt.detail)" },
  { "length": 6, "variant": "joint", "mask": true, "@change": "(evt) => (evt.target.value = evt.detail)" },
  { "length": 4, "variant": "underline", "@change": "(evt) => (evt.target.value = evt.detail)" },
  { "length": 4, "error": true, "value": "1234" },
  { "length": 4, "disabled": true, "value": "12" }
]
```

</gbp-example>

## API

<gbp-api name="tap-pin-code" src="/src/elements/pin-code.ts"></gbp-api>
