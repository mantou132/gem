# `<tap-select>`

下拉选择框组件。直接包装原生 `<select>` 元素，为受控组件。支持自定义选项列表、占位符及禁用状态。

## Example

<gbp-example name="tap-select" src="https://esm.sh/@mantou/tap-ui/elements/select">

```json
[
  {
    "placeholder": "请选择...",
    "options": ["选项 1", "选项 2", "选项 3"],
    "@change": "(evt) => evt.target.value = evt.detail"
  },
  {
    "value": "2",
    "options": [
      { "label": "选项 1", "value": "1" },
      { "label": "选项 2", "value": "2" },
      { "label": "选项 3", "value": "3" }
    ],
    "@change": "(evt) => evt.target.value = evt.detail"
  },
  {
    "placeholder": "已禁用",
    "disabled": true,
    "options": ["选项 1", "选项 2"]
  }
]
```

</gbp-example>

## API

<gbp-api name="tap-select" src="/src/elements/select.ts"></gbp-api>
