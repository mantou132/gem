# `<tap-compartment>`

A component that creates an isolated styling context, preventing external styles from affecting its internal elements. This is particularly useful when embedding third-party content or creating isolated UI components.

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
