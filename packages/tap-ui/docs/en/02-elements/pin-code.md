# `<tap-pin-code>`

PIN / OTP (One-Time Password) code input component. A segmented fixed-length character input designed for mobile devices, supporting SMS verification codes, 2FA tokens, and payment PINs, with native touch input, SMS autofill, and masking.

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
