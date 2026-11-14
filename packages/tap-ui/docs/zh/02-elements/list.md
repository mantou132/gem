# `<tap-list>`

列表组件，支持基础列表渲染和无限滚动。列表项由 `renderItem` 渲染，设置 `infinite` 后大量数据会被虚拟化。

## Example

<gbp-example name="tap-list" src="https://esm.sh/@mantou/tap-ui/elements/list">

```json
{
  "items": ["Item 1", "Item 2", "Item 3"]
}
```

</gbp-example>

## 无限滚动示例

<gbp-example name="tap-list" src="https://esm.sh/@mantou/tap-ui/elements/list">

```json
[
  {
    "tagName": "style",
    "innerHTML": "::part(item){padding:0.5em;border-bottom:1px solid gainsboro}"
  },
  {
    "style": "overflow:auto;height:300px;width:100%;overscroll-behavior:contain;text-align:center;",
    "items": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    "infinite": true,
    "getKey": "(item) => item",
    "@backward": "({target})=>target.items=[...target.items,...Array.from({length:150},(_,i)=>target.items.length+i)]"
  }
]
```

</gbp-example>

<gbp-example name="tap-list" src="https://esm.sh/@mantou/tap-ui/elements/list">

```json
[
  {
    "tagName": "style",
    "innerHTML": "::part(list){display:grid;grid-template-columns:repeat(auto-fill,minmax(12em,1fr));gap:1em;}::part(item){font-size:3em;font-weight:bolder;aspect-ratio:1;border:1px solid gainsboro;display:flex;place-content:center;place-items:center;}"
  },
  {
    "style": "overflow:auto;height:300px;width:100%;overscroll-behavior:contain;",
    "items": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    "infinite": true,
    "debug": true,
    "getKey": "(item) => item",
    "renderItem": "(item) => item",
    "@backward": "({target})=>target.items=[...target.items,...Array.from({length:150},(_,i)=>target.items.length+i)]"
  }
]
```

</gbp-example>

## API

<gbp-api name="tap-list" src="/src/elements/list.ts"></gbp-api>
