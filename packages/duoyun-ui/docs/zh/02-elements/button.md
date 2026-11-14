# `<dy-button>`

在 [`<tap-button>`](https://tap-ui.gemjs.org/zh/elements/button) 的基础上增加了下拉菜单，完整 API 参考其文档。

## Example

<gbp-example name="dy-button" src="https://esm.sh/duoyun-ui/elements/button">

```json
[
  { "innerHTML": "Delete Post", "color": "danger" },
  {
    "innerHTML": "Create Post",
    "color": "danger",
    "type": "reverse",
    "dropdown": [{ "text": "Label 1" }, { "text": "Label 2" }]
  }
]
```

</gbp-example>

## API

<gbp-api src="/src/elements/button.ts"></gbp-api>
