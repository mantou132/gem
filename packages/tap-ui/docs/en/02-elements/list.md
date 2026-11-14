# `<tap-list>`

A list component that supports both basic list rendering and infinite scrolling. Items are rendered by `renderItem`, and large datasets are virtualized when `infinite` is set.

## Example

<gbp-example name="tap-list" src="https://esm.sh/@mantou/tap-ui/elements/list">

```json
{
  "items": ["Item 1", "Item 2", "Item 3"]
}
```

</gbp-example>

## Infinite Scroll Example

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
