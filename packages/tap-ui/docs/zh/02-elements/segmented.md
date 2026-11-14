# `<tap-segmented>`

分段控制器由两个或多个分段线性排列，每个分段都是互斥的按钮，所有分段宽度相等。

## Example

<gbp-example name="tap-segmented" src="https://esm.sh/@mantou/tap-ui/elements/segmented">

```json
{
  "value": 0,
  "options": [{ "label": "Item" }, { "label": "Item 2" }, { "label": "Item 3" }],
  "@change": "(evt) => evt.target.value = evt.detail"
}
```

</gbp-example>

## API

<gbp-api src="/src/elements/segmented.ts"></gbp-api>
