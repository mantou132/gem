# `<tap-compartment>`

创建隔离的样式上下文，防止外部样式影响其内部元素，适用于嵌入第三方内容或创建隔离的 UI 组件。

## Example

```ts
const style = css`
  * {
    color: red;
  }
`;

html`
  <tap-compartment
    .styles=${style}
    .content=${html`<div>test</div>`}
  ></tap-compartment>
`;
```

## `<tap-compartment>` API

<gbp-api src="/src/elements/compartment.ts"></gbp-api>
