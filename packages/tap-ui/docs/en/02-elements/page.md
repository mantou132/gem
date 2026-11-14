# `<tap-page>`

The page layout of mobile apps, with header and footer slots, safe area insets and pull-to-refresh.
Content scrolls in the page itself and runs under the header and footer, padding keeps it clear of them.
Don't add another scroll container, use `scrollElement` instead.

## Example

```ts
import '@mantou/tap-ui/elements/page';
import '@mantou/tap-ui/elements/navbar';
import '@mantou/tap-ui/elements/content';

const onRefresh = ({ detail: done }: CustomEvent<() => void>) => {
  fetchData().then(done);
};

html`
  <tap-page refreshable @refresh=${onRefresh}>
    <tap-navbar slot="header" title="Chats"></tap-navbar>
    <tap-content>...</tap-content>
    <tap-tabbar slot="footer" .items=${tabs}></tap-tabbar>
  </tap-page>
`;
```

Use `floatheader` to overlay the header on the content, the navbar stays transparent until the content scrolls.

## API

<gbp-api name="tap-page" src="/src/elements/page.ts"></gbp-api>
