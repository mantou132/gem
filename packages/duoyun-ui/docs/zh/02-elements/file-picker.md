# `<dy-file-picker>`

## Example

<gbp-example name="dy-file-picker" src="https://jspm.dev/duoyun-ui/elements/file-picker">

```json
[
  {
    "style": "width: 100%;",
    "innerHTML": "上传文件夹",
    "multiple": true,
    "directory": true,
    "@change": "(evt) => evt.target.value = evt.detail"
  },
  {
    "style": "width: 100%;",
    "innerHTML": "上传图片",
    "multiple": true,
    "type": "image",
    "@change": "(evt) => evt.target.value = evt.detail"
  }
]
```

</gbp-example>

## API

<gbp-api src="/src/elements/file-picker.ts"></gbp-api>
