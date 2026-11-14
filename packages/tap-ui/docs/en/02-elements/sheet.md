# `<tap-sheet>`

Bottom sheet with drag handle. Pull down or tap the mask to dismiss, supports snap points.

## Example

```ts
import { Sheet } from '@mantou/tap-ui/elements/sheet';

// Settles when dismissed
await Sheet.open({
  header: 'Sheet',
  body: html`<p>Pull down or tap the mask to dismiss.</p>`,
  maskClosable: true,
});

// Snap at 45% and 90% height (`snap: [0.45, 0.9]`), contents scroll only when fully expanded
Sheet.open({
  header: 'Snap Sheet',
  body: html`...`,
  snap: true,
});
```

It can also be written in the template:

```ts
html`
  <tap-sheet ?open=${open} header="Sheet" mask-closable @close=${onClose}>...</tap-sheet>
`;
```

## API

<gbp-api name="tap-sheet" src="/src/elements/sheet.ts"></gbp-api>
