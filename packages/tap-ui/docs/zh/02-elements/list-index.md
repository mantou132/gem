# `<tap-list-index>`

长列表的字母索引栏，类似 iOS 通讯录，点击或滑动时将目标滚动到可见区域。
默认目标是 `data-list-index` 属性匹配的元素。

## Example

```ts
html`
  <section data-list-index="A">...</section>
  <section data-list-index="B">...</section>
  <tap-list-index .items=${['A', 'B']}></tap-list-index>
`;
```

## API

<gbp-api name="tap-list-index" src="/src/elements/list-index.ts"></gbp-api>
