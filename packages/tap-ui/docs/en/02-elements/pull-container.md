# `<tap-pull-container>`

A scroll container that detects pulling down at the top and pushing up at the bottom,
it's the base of the pull gestures of [`<tap-page>`](./page.md), [`<tap-card>`](./card.md) and [`<tap-sheet>`](./sheet.md).

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
