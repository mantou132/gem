# `<tap-swipeout>`

像 iOS 一样水平滑动列表项来显示操作，操作放在 `start` 或 `end` 插槽中。
设置 `enable-long-drag` 后，拖得足够远会触发最外侧的操作并触发 `long-drag` 事件，
`danger` 插槽中的元素放在末尾，长拖时会扩展到整个宽度。

## Example

<gbp-example name="tap-swipeout" src="https://esm.sh/@mantou/tap-ui/elements/swipeout">

```json
{
  "style": "width: 100%;",
  "enableLongDrag": true,
  "innerHTML": "<button slot='start'>Pin</button><button slot='end'>More</button><button slot='danger' style='background: red; color: white'>Delete</button><div style='padding: 1em'>Swipe left or right</div>"
}
```

</gbp-example>

## API

<gbp-api name="tap-swipeout" src="/src/elements/swipeout.ts"></gbp-api>
