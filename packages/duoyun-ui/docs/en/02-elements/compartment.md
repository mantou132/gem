# `<dy-compartment>`

Used to isolate elemental styles to avoid the contents of the user affect internal elements.

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
