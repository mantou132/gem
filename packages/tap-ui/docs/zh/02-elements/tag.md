# `<tap-tag>`

标签组件。用于标记和分类，支持多种语义色、幽灵/实心样式以及可关闭操作。

## Example

<gbp-example name="tap-tag" src="https://esm.sh/@mantou/tap-ui/elements/tag">

```json
[
  { "innerHTML": "默认标签" },
  { "innerHTML": "成功", "color": "positive" },
  { "innerHTML": "信息", "color": "informative" },
  { "innerHTML": "警告", "color": "notice" },
  { "innerHTML": "错误", "color": "negative" },
  { "innerHTML": "反色样式", "color": "informative", "type": "reverse" },
  { "innerHTML": "可关闭", "closable": true }
]
```

</gbp-example>

## API

<gbp-api name="tap-tag" src="/src/elements/tag.ts"></gbp-api>
