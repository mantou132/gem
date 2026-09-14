# `<tap-checkbox>`

复选框与复选框组。用于在多个选项中进行多项选择，支持半选（indeterminate）状态。

## Example

<gbp-example name="tap-checkbox" src="https://esm.sh/@mantou/tap-ui/elements/checkbox">

```json
[
  { "innerHTML": "已勾选", "checked": true },
  { "innerHTML": "未勾选", "checked": false },
  { "innerHTML": "半选状态", "indeterminate": true },
  { "innerHTML": "禁用选项", "disabled": true, "checked": true }
]
```

</gbp-example>

<gbp-example name="tap-checkbox-group" src="https://esm.sh/@mantou/tap-ui/elements/checkbox">

```json
{
  "value": ["apple", "banana"],
  "options": [
    { "label": "苹果", "value": "apple" },
    { "label": "香蕉", "value": "banana" },
    { "label": "橙子", "value": "orange" }
  ]
}
```

</gbp-example>

## `<tap-checkbox>` API

<gbp-api name="tap-checkbox" src="/src/elements/checkbox.ts"></gbp-api>

## `<tap-checkbox-group>` API

<gbp-api name="tap-checkbox-group" src="/src/elements/checkbox.ts"></gbp-api>
