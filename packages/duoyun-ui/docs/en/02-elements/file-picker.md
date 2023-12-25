# `<dy-file-picker>`

## Example

<gbp-example name="dy-file-picker" src="https://esm.sh/duoyun-ui/elements/file-picker">

```json
[
  {
    "style": "width: 100%;",
    "innerHTML": "Upload Directory",
    "multiple": true,
    "directory": true,
    "@change": "(evt) => evt.target.value = evt.detail"
  },
  {
    "style": "width: 100%;",
    "innerHTML": "Upload Image",
    "multiple": true,
    "type": "image",
    "@change": "(evt) => evt.target.value = evt.detail"
  }
]
```

</gbp-example>

## API

<gbp-api src="/src/elements/file-picker.ts"></gbp-api>
