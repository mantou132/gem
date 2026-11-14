# `<tap-pull-container>`

检测在顶部下拉和在底部上推的滚动容器，
是 [`<tap-page>`](./page.md)、[`<tap-card>`](./card.md) 和 [`<tap-sheet>`](./sheet.md) 下拉手势的基础。

## Example

```ts
html`
  <tap-pull-container
    @pull=${({ detail }) => console.log(detail.distance)}
    @pull-end=${({ detail }) => detail.distance > 100 && refresh()}
  >
    ...
  </tap-pull-container>
`;
```

## API

<gbp-api name="tap-pull-container" src="/src/elements/pull-container.ts"></gbp-api>
