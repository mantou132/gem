# `<dy-grouped-picker>`

用于在一个紧凑控件中编辑多组独立选项。每个顶层选项定义一个分组，选择子选项时会返回分组键和所选值。

## 示例

<gbp-example name="dy-grouped-picker" src="https://esm.sh/duoyun-ui/elements/grouped-picker">

```json
{
  "placeholder": "选择筛选条件",
  "value": { "status": "进行中", "priority": "高" },
  "renderValue": "(value) => Object.values(value || {}).join(' · ')",
  "options": [
    {
      "label": "状态",
      "value": "status",
      "children": [{ "label": "进行中" }, { "label": "已结束" }]
    },
    {
      "label": "优先级",
      "value": "priority",
      "children": [{ "label": "高" }, { "label": "中" }, { "label": "低" }]
    }
  ],
  "@change": "(evt) => evt.target.value = { ...evt.target.value, [evt.detail.group]: evt.detail.value }"
}
```

</gbp-example>

该组件是受控组件，收到 `change` 事件后需要更新 `value`。`value` 的键对应各分组的 `value`；子选项没有指定
`value` 时，会使用其 `label` 作为选中值。选择器默认显示第一组的选中标签；可使用 `renderValue` 汇总展示多个分组。

## API

<gbp-api src="/src/elements/grouped-picker.ts"></gbp-api>
