# `<tap-browser>`

In-app browser, opens a URL in an iframe page pushed to [`<tap-stack>`](./stack.md),
with a navbar and an action sheet for custom actions.

## Example

```ts
import { Browser } from '@mantou/tap-ui/elements/browser';

// Settles when closed
await Browser.open({
  src: 'https://example.com',
  title: 'Help',
  items: [{ label: 'Share', handler: () => share() }],
});
```

## API

<gbp-api name="tap-browser" src="/src/elements/browser.ts"></gbp-api>
