# `<dy-input>`

## Example

<gbp-example name="dy-input" direction="column" src="https://jspm.dev/duoyun-ui/elements/input">

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
