# Gem SSR

Server render Gem element

## Basic usage

```js
// Import before any Gem element
import { renderToString } from '@mantou/gem-ssr';

app.get('/', async (req, res) => {
  const content = await renderToString(html`<app-root></app-root>`, { url: req.url });
  res.send(templateContent.replace(`<app-root></app-root>`, content));
});
```

Client entry, import before any Gem element to enable hydration:

```js
import '@mantou/gem-ssr/client';
```

## Streaming

`render` returns an async iterable, the content before the pending async elements (routes, `@server` methods)
is output first, independent async elements are awaited in parallel:

```js
import { render } from '@mantou/gem-ssr';

const stream = ReadableStream.from(render(html`<app-root></app-root>`, { url: req.url }));
```

## How it works

The server does not create a DOM tree, element instances are created with a minimal DOM shim,
their templates are rendered to strings, so element code must not access the DOM during rendering
(e.g. `querySelector`, `closest`), effects (`@effect`, `@mounted`) are not executed on the server.

Light DOM element styles are output into the element where they first appear, and removed after hydration.

Bindings inside `<style>`, `<script>`, `<textarea>` and `<title>` can be rendered, but not hydrated.

## Concurrent requests

Each render runs in its own request scope (`AsyncLocalStorage`), stores, `history`, `location` and
the `I18n` language are isolated between requests, so requests are rendered concurrently.
Keep request-specific state in stores, other module-level variables are shared by all requests.

Each request gets a shallow copy of the store, so update the top-level properties instead of
mutating nested objects, the in-place mutation is shared by all requests:

```js
userStore({ tags: [...userStore.tags, tag] }); // ✅
userStore.tags.push(tag); // ❌
```

Use `runInRequest` to prepare state in the same scope before rendering:

```js
import { renderToString, runInRequest } from '@mantou/gem-ssr';

const html = await runInRequest(async () => {
  await i18n.setLanguage(lang);
  return renderToString(html`<app-root></app-root>`, { url: req.url });
});
```

## Store

Pass per-request store values with a key, the values after rendering are output to the page (JSON values only):

```js
renderToString(html`<app-root></app-root>`, {
  url: req.url,
  stores: { user: [userStore, { nickname: 'alice' }] },
});
```

Read them on the client before the elements are defined, e.g. in a module imported before the elements:

```js
import { hydrateStores } from '@mantou/gem-ssr/client';

hydrateStores({ user: userStore });
```

## Server Method

The method marked with `@server()` is executed on the server and waits for completion before serializing,
the element state after execution is output to the page (JSON values only).
When it runs on the client is decided by other decorators such as `@mounted()` and `@effect()`,
the restored element skips it in the first round of effects.

```ts
import { server } from '@mantou/gem-ssr/decorators';

@customElement('gem-ssr')
class GemSsrElement extends GemElement {
  #state = createState({ content: '' });

  @server()
  @mounted()
  #init = async () => {
    this.#state({ content: await fetchContent() });
  };
}
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
  #init = async () => {
    this.#state({ content: await 1 });
  };
}
```

`@server('lazy')` returns first, then executes, and re-renders the content after execution.

### Server Side Element

A lazy special case that never loads element

```ts
@lazy('never')
@customElement('gem-ssr')
class GemSsrElement extends GemElement {}
```
