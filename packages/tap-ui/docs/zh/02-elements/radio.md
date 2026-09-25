# `<tap-radio>`

单选框与单选框组。用于在一组互斥选项中进行单项选择。

## Example

<gbp-example name="tap-radio" src="https://esm.sh/@mantou/tap-ui/elements/radio">

```json
[
  { "innerHTML": "选中状态", "checked": true },
  { "innerHTML": "未选中", "checked": false },
  { "innerHTML": "禁用状态", "disabled": true, "checked": true }
]
```

</gbp-example>

<gbp-example name="tap-radio-group" src="https://esm.sh/@mantou/tap-ui/elements/radio">

```json
{
  "heading": "水果",
  "value": "apple",
  "options": [
    { "label": "苹果", "value": "apple" },
    { "label": "香蕉", "value": "banana", "description": "黄色水果" },
    { "label": "橙子", "value": "orange", "disabled": true }
  ],
  "@change": "(evt) => evt.currentTarget.value = evt.detail"
}
```

</gbp-example>

## `<tap-radio>` API

<gbp-api name="tap-radio" src="/src/elements/radio.ts"></gbp-api>

## `<tap-radio-group>` API

<gbp-api name="tap-radio-group" src="/src/elements/radio.ts"></gbp-api>
