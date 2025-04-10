# `<dy-shortcut-record>`

A component for recording keyboard shortcuts. It captures key combinations and displays them in a user-friendly format, with support for modifier keys (Ctrl, Alt, Shift, Meta) and regular keys.

## Example

<gbp-example name="dy-shortcut-record" src="https://esm.sh/duoyun-ui/elements/shortcut-record">

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
