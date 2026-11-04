# `<tap-date-picker>`

Date and time picker. Wraps native inputs such as `<input type="date">`, opening the system picker on tap, as a controlled component. `value` uses the native format, and the displayed text is formatted for the current locale.

## Example

<gbp-example name="tap-date-picker" src="https://esm.sh/@mantou/tap-ui/elements/date-picker">

```json
[
  {
    "placeholder": "Select date",
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
    "placeholder": "Select date and time",
    "@change": "(evt) => evt.target.value = evt.detail"
  },
  {
    "type": "month",
    "value": "2026-11",
    "@change": "(evt) => evt.target.value = evt.detail"
  },
  {
    "placeholder": "Disabled",
    "disabled": true
  }
]
```

</gbp-example>

## Constraints

`min`, `max` and `step` are passed to the native input, but some platforms (such as iOS) don't enforce them in the picker, so validate on submit.

## API

<gbp-api name="tap-date-picker" src="/src/elements/date-picker.ts"></gbp-api>
