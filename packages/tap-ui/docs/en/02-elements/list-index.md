# `<tap-list-index>`

An alphabet index bar for long lists, like iOS contacts. Tap or slide on it to scroll the target into view.
By default the target is the element with the matching `data-list-index` attribute.

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
