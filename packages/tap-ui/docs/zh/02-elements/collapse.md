# `<tap-collapse>`

可折叠内容组件，允许用户展开和收起内容区块。支持单个或多个面板展开模式，并支持搜索过滤内容。

## Example

<gbp-example name="tap-collapse" src="https://esm.sh/@mantou/tap-ui/elements/collapse">

```json
{
  "style": "width: 100%",
  "searchable": true,
  "type": "single",
  "items": [
    {
      "summary": "Title 1",
      "detail": "This is collapse 1 panel"
    },
    {
      "summary": "Title 2",
      "detail": "This is collapse 2 panel"
    },
    {
      "summary": "Title 3",
      "detail": "This is collapse 3 panel"
    }
  ]
}
```

</gbp-example>

## `<tap-collapse>` API

<gbp-api name="tap-collapse" src="/src/elements/collapse.ts"></gbp-api>
