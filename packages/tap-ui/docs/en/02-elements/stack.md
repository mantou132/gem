# `<tap-stack>`

Stack navigation like iOS. Pushed pages slide in from the right, and swipe right from the left edge to close.
Pages are pushed into the history stack by default, so the back button of the browser or system also closes them.

## Example

```ts
import { Stack } from '@mantou/tap-ui/elements/stack';

// Push a page to the global root stack
Stack.push({
  content: html`<my-detail-page></my-detail-page>`,
});

// Close the top page
Stack.pop();
```

Use the closest stack in an element, e.g. a stack inside a sheet:

```ts
Stack.getClosestStack(this)?.push({ content: html`<my-profile-page></my-profile-page>` });
```

## API

<gbp-api name="tap-stack" src="/src/elements/stack.ts"></gbp-api>
