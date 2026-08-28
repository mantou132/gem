# `<dy-grouped-picker>`

A compact picker for editing several independent values. Each top-level option defines a group, and
selecting one of its children emits the group key and selected value.

## Example

<gbp-example name="dy-grouped-picker" src="https://esm.sh/duoyun-ui/elements/grouped-picker">

```json
{
  "placeholder": "Select filters",
  "value": { "status": "Open", "priority": "High" },
  "renderValue": "(value) => Object.values(value || {}).join(' · ')",
  "options": [
    {
      "label": "Status",
      "value": "status",
      "children": [{ "label": "Open" }, { "label": "Closed" }]
    },
    {
      "label": "Priority",
      "value": "priority",
      "children": [{ "label": "High" }, { "label": "Medium" }, { "label": "Low" }]
    }
  ],
  "@change": "(evt) => evt.target.value = { ...evt.target.value, [evt.detail.group]: evt.detail.value }"
}
```

</gbp-example>

The component is controlled: update `value` after receiving `change`. Its keys correspond to each
group's `value`. A child option without a `value` uses its `label` as the selected value. By default,
the picker displays the first group's selected label; use `renderValue` to summarize multiple groups.

## API

<gbp-api src="/src/elements/grouped-picker.ts"></gbp-api>
