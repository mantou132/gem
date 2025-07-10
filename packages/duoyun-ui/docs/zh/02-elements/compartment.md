# `<dy-compartment>`

用于隔离元素样式，避免用户提交的内容影响内部元素。

```ts
const style = css`
  * {
    color: red;
  }
`;

html`
  <dy-compartment
    .styles=${style}
    .content=${html`<div>test</div>`}
  ></dy-compartment>
`;
```

## `<dy-compartment>` API

<gbp-api src="/src/elements/compartment.ts"></gbp-api>