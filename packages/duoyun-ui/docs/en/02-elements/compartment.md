# `<dy-compartment>`

A component that creates an isolated styling context, preventing external styles from affecting its internal elements. This is particularly useful when embedding third-party content or creating isolated UI components.

## Example

```ts
html`
  <dy-compartment
    .content=${html`
      <style>
        * {
          color: red;
        }
      </style>
    `}
  ></dy-compartment>
`;
```
