# `<dy-list>`

在 [`<tap-list>`](https://tap-ui.gemjs.org/zh/elements/list) 的基础上提供了默认的 `renderItem`，将对象类型的列表项渲染为头像、标题和描述，完整 API 参考其文档。

## Example

<gbp-example name="dy-list" src="https://esm.sh/duoyun-ui/elements/list">

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

## API

<gbp-api name="dy-list" src="/src/elements/list.ts"></gbp-api>
