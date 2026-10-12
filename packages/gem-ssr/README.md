# Gem SSR

Server render Gem element

## Basic usage

```js
// Import before any Gem element
import { renderToString } from 'gem-ssr';

app.get('/', async (req, res) => {
  const content = await renderToString(html`<app-root></app-root>`, { url: req.url });
  res.send(templateContent.replace(`<app-root></app-root>`, content));
});
```

Client entry, import before any Gem element to enable hydration:

```js
import 'gem-ssr/client';
```

## Store

Pass per-request store values with a key, the values after rendering are output to the page,
and the stores are restored after rendering so other requests are not affected (JSON values only):

```js
renderToString(html`<app-root></app-root>`, {
  url: req.url,
  stores: { user: [userStore, { nickname: 'alice' }] },
});
```

Read them on the client before the elements are defined, e.g. in a module imported before the elements:

```js
import { hydrateStores } from 'gem-ssr/client';

hydrateStores({ user: userStore });
```

## Improve WebApp Performance (Planned)

### Lazy View

The server renders the initial data, load the element when user interacting, and then playback of the interaction event

```ts
@lazy()
@customElement('gem-ssr')
class GemSsrElement extends GemElement {
  #state = createState({ content: 0 });

  @server() // or `@server('lazy')`
  @mounted()
  #init = async () => {
    this.#state({ content: await 1; });
  }
}
```

The method marked with `@server()` waits for execution to complete on the server before returning, while `@server('lazy')` returns first, then executes, and re-renders the content after execution.

### Server Side Element

A lazy special case that never loads element

```ts
@lazy('never')
@customElement('gem-ssr')
class GemSsrElement extends GemElement {}
```
