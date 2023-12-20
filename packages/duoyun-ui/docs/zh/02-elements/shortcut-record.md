# `<dy-shortcut-record>`

## Example

<gbp-example name="dy-shortcut-record" src="https://jspm.dev/duoyun-ui/elements/shortcut-record">

```json
{
  "placeholder": "Focus on him",
  "tooltip": "Press key",
  "clearable": true,
  "@clear": "(evt) => evt.target.value = null",
  "@change": "(evt) => evt.target.value = evt.detail"
}
```

</gbp-example>

## API

<gbp-api src="/src/elements/shortcut-record.ts"></gbp-api>
