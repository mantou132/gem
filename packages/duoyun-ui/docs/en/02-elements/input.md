# `<dy-input>`

A versatile input component that supports various input types and features like data lists, clearable inputs, and number inputs. It provides a consistent and accessible way to collect user input with built-in validation and formatting options.

## Example

<gbp-example name="dy-input" direction="column" src="https://esm.sh/duoyun-ui/elements/input">

```json
[
  {
    "value": "Option",
    "@change": "(evt) => evt.target.value = evt.detail",
    "dataList": [
      {
        "label": "Option1"
      },
      {
        "label": "Option2"
      }
    ]
  },
  {
    "placeholder": "Your name",
    "clearable": true,
    "@clear": "(evt) => evt.target.value = null",
    "@change": "(evt) => evt.target.value = evt.detail"
  },
  {
    "type": "number",
    "value": 1,
    "@change": "(evt) => evt.target.value = evt.detail"
  },
  {
    "value": "mantou",
    "disabled": true
  }
]
```

</gbp-example>

## API

<gbp-api src="/src/elements/input.ts"></gbp-api>
