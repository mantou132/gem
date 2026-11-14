# `<tap-pat-search>`

搜索页。查询为空时显示最近搜索，否则显示结果。适合远程搜索；过滤本地列表请用 `<tap-pat-picker searchable>`。

输入时发出 `search`，由调用方获取结果后设置 `items`（期间设置 `loading`）。回车或点击最近搜索时发出 `submit`，可用来保存历史。选择结果只发出 `change`。

## Example

<gbp-example name="tap-pat-search" src="https://esm.sh/@mantou/tap-ui/patterns/search">

```json
[
  {
    "style": "width: 100%; height: 400px",
    "history": ["Gem", "Web Components", "TapUI"],
    "@search": "(evt) => { evt.target.items = ['Apple', 'Banana', 'Cherry', 'Grape', 'Mango'].filter((label) => label.toLowerCase().includes(evt.detail.toLowerCase())).map((label) => ({ label })) }",
    "@submit": "(evt) => evt.target.history = [evt.detail, ...evt.target.history.filter((q) => q !== evt.detail)]",
    "@clearhistory": "(evt) => evt.target.history = []",
    "@change": "(evt) => console.log(evt.detail)"
  }
]
```

</gbp-example>

## 远程搜索

忽略过期的响应，避免慢请求覆盖较新的结果。

```ts
let latest = '';

const onSearch = async (evt) => {
  const search = evt.target;
  const query = (latest = evt.detail);
  search.loading = !!query;
  if (!query) return;
  const items = await fetchSuggestions(query);
  if (query !== latest) return;
  search.items = items;
  search.loading = false;
};
```

## API

<gbp-api name="tap-pat-search" src="/src/patterns/search.ts"></gbp-api>
