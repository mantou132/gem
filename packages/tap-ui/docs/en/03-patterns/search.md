# `<tap-pat-search>`

Search page. Shows recent searches while the query is empty, and results otherwise. Suited to remote search; for filtering a local list use `<tap-pat-picker searchable>`.

Typing emits `search`; the caller fetches the results and sets `items` (with `loading` meanwhile). Pressing Enter or tapping a recent search emits `submit`, which can be used to save the history. Selecting a result only emits `change`.

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

## Remote search

Ignore stale responses so a slow request does not overwrite newer results.

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
