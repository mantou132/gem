# `<dy-list>`

## Example

<gbp-example name="dy-list" src="https://jspm.dev/duoyun-ui/elements/list">

```json
{
  "items": [
    {
      "title": "Title 1",
      "avatar": "https://api.dicebear.com/5.x/bottts-neutral/svg?seed=1",
      "description": "Mollit aliqua reprehenderit enim consequat dolor ipsum dolor excepteur veniam laborum aliqua."
    },
    {
      "title": "Title 2",
      "avatar": "https://api.dicebear.com/5.x/bottts-neutral/svg?seed=2",
      "description": "Mollit aliqua reprehenderit enim consequat dolor ipsum dolor excepteur veniam laborum aliqua."
    },
    {
      "title": "Title 3",
      "avatar": "https://api.dicebear.com/5.x/bottts-neutral/svg?seed=3",
      "description": "Mollit aliqua reprehenderit enim consequat dolor ipsum dolor excepteur veniam laborum aliqua."
    }
  ]
}
```

</gbp-example>

## Infinite Scroll Example

<gbp-example name="dy-list" src="https://jspm.dev/duoyun-ui/elements/list">

```json
{
  "style": "overflow:auto;height:300px;width:100%;overscroll-behavior:contain;",
  "items": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  "infinite": true,
  "getKey": "(item) => item",
  "@backward": "({target})=>setTimeout(()=>target.items=[...target.items,...Array.from({length:150},(_,i)=>target.items.length+i)],100)"
}
```

</gbp-example>

<gbp-example name="dy-list" src="https://jspm.dev/duoyun-ui/elements/list">

```json
{
  "style": "overflow:auto;height:300px;width:100%;overscroll-behavior:contain;",
  "items": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  "infinite": true,
  "getKey": "(item) => item",
  "renderItem": "(item) => item",
  "@backward": "({target})=>setTimeout(()=>target.items=[...target.items,...Array.from({length:150},(_,i)=>target.items.length+i)],100)",
  "innerHTML": "<style>dy-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(12em,1fr));}::part(before-outside){grid-column:1/-1;}::part(item){aspect-ratio:1;border:1px solid gainsboro;display:flex;place-content:center;place-items:center;}</style>"
}
```

</gbp-example>

## API

<gbp-api name="dy-list" src="/src/elements/list.ts"></gbp-api>
