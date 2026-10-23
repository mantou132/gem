# Gem SSR

Server-side rendering and hydration for Gem elements:
- Elements are rendered to HTML on the server, Shadow DOM is output as [Declarative Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template#shadowrootmode)
- The client takes over the server-rendered DOM without re-rendering it
- Streaming: the content before pending async elements is sent first
- Concurrent requests: stores, `history`, `location` and the `I18n` language are isolated per request
- Server data: `@server()` methods and stores are rendered on the server and restored on the client

For file-based routing, layouts, page data and prerendering, use [gemkit](https://github.com/mantou132/gem/tree/main/packages/gemkit), which is built on this package.

## Setup

Server entry, import `@mantou/gem-ssr` before any Gem module, it provides the minimal DOM that Gem needs:

```js
import { renderToString } from '@mantou/gem-ssr';

import './elements/root';

app.get('*', async (req, res) => {
  const content = await renderToString(html`<app-root></app-root>`, { url: req.url });
  res.send(template.replace('<!--app-->', content));
});
```

Client entry, import `@mantou/gem-ssr/client` before any element or store is created to enable hydration:

```js
import '@mantou/gem-ssr/client';

import './elements/root';
```

Use [unplugin-gem](https://github.com/mantou132/gem/tree/main/packages/unplugin-gem) with the `ssr` option in both the client and server builds,
it adds keys to module level stores (see [Store](#store)) and removes the SSR code of Gem from the client build:

```js
unpluginGem({ ssr: true });
```

## Rendering

`renderToString` returns the HTML when everything is rendered. `render` returns an async iterable,
the content before pending async elements (routes, `@server()` methods) is output first,
independent async elements are awaited in parallel:

```js
import { render } from '@mantou/gem-ssr';

const stream = ReadableStream.from(render(html`<app-root></app-root>`, { url: req.url }));
```

- `url`: the request URL, used by `location`, `history` and routes, default `http://localhost/`
- Rendering starts when `render` is called, it is not affected by how fast the output is read
- The output only contains the rendered template, insert it into your HTML document
- If an element throws while rendering (and has no `@fallback()`), or a route fails to load, the rendering fails:
  `renderToString` rejects and the `render` iterable throws

## Hydration

The server output contains comment markers for the bindings of each template. When an element renders on the client
for the first time, the markers are used to connect the bindings to the existing DOM, event listeners and properties are
set, but the DOM is not recreated. Values that differ from the server output are updated, so the client must render the
same values as the server, see [Server data](#server-data).

## Server data

Data read during rendering must be available on the client when it hydrates, otherwise the client renders different
content and overwrites the server output. There are two ways to send data to the client.

### Element state: `@server()`

The method marked with `@server()` is executed on the server and awaited before the element is output, the element state
after execution is output to the page (JSON values only) and restored before the element renders on the client.

When it runs on the client is decided by other decorators, such as `@mounted()` and `@effect()`.
The restored element skips it in the first round of effects, so it does not load the data again:

```ts
import { server } from '@mantou/gem-ssr/decorators';

@customElement('app-comments')
class AppCommentsElement extends GemElement {
  #state = createState({ comments: [] as Comment[] });

  // Server: awaited before output; client: runs when mounted by client navigation
  @server()
  @mounted()
  #load = async () => this.#state({ comments: await fetchComments() });

  @template()
  #content = () => html`${this.#state.comments.map((comment) => html`<p>${comment.text}</p>`)}`;
}
```

- The method also runs on the client (unless only `@server()` is used), so it must use isomorphic APIs such as `fetch`
- The template must handle the state before loading, the element created on the client starts from it

### Store

Stores with a key that are updated during the request (before or while rendering) are output to the page
(JSON values only), the client uses these values when the store with the same key is created.
Stores without a key or not updated in the request are not output.

The `ssr` option of `unplugin-gem` (or `swc-plugin-gem`) adds the key to module level `const store = createStore(...)`
automatically, the key is generated from the file path and the variable name, so it is the same in the client and
server builds. Without the plugin, pass the key manually:

```js
export const userStore = createStore({ nickname: 'guest' }, 'user');
```

Set per-request values with `runInRequest` (see [Concurrent requests](#concurrent-requests)), or update the store in
`@server()` methods:

```js
const html = await runInRequest(() => {
  userStore({ nickname: req.user.nickname });
  return renderToString(html`<app-root></app-root>`, { url: req.url });
});
```

### Where should data live

|                     | Element state + `@server()`                        | Store                           | Route data (e.g. gemkit `load`)            |
| ------------------- | -------------------------------------------------- | ------------------------------- | ------------------------------------------ |
| Scope               | One element, any element                           | Shared by elements and pages    | A route (page or layout)                   |
| Lifetime            | The element                                        | The app, kept across navigation | The route, reloaded on navigation          |
| Blocks the document | No, streamed when ready                            | No                              | Yes, it can decide the title and status    |
| Client navigation   | Shows the page, then loads (needs a loading state) | Not reloaded automatically      | Waits for the data, then switches the page |
- Data that decides whether and how the page is shown (main content, title, 404): route data
- Data owned by a component that can arrive later (comments, recommendations): element state + `@server()`
- Data shared by many elements or kept across navigation (current user, theme, cart): store

They can be combined, e.g. route data writes the current user into a store that the navigation bar reads.

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

Use `runInRequest` to prepare state in the same scope before rendering, `render` and `renderToString` called inside it
use the same scope:

```js
import { renderToString, runInRequest } from '@mantou/gem-ssr';

const html = await runInRequest(async () => {
  await i18n.setLanguage(lang);
  return renderToString(html`<app-root></app-root>`, { url: req.url });
});
```

To isolate other module-level objects, wrap them with `isolate`, reads and writes go to a per-request shallow copy:

```js
import { isolate } from '@mantou/gem/lib/server';

export const requestInfo = isolate({ locale: '' });
```

## Writing elements for SSR

The server does not create a DOM tree, element instances are created with a minimal DOM shim and their templates are
rendered to strings:
- Effects (`@effect()`, `@mounted()`, `@unmounted()`) are not executed on the server, put DOM and browser API access in them
- Do not access the DOM while rendering (constructor, `@memo()`, `@template()`), e.g. `querySelector`, `closest`,
  `getBoundingClientRect`
- Do not access browser-only APIs at module level, e.g. `localStorage`
- Browser features are reported as unsupported on the server: `matchMedia()` does not match, `CSS.supports()` returns `false`
- If the template returns `undefined`, `shadowRoot.innerHTML` (or `innerHTML` of a Light DOM element) set by the
  element is output as is (not hydrated), e.g. trusted HTML styled by global CSS
- Light DOM elements with a template can not have children in the parent template, they are not hydrated,
  use Shadow DOM and `<slot>` instead

Output details:
- Shadow DOM styles are output in each shadow root, Light DOM element styles are output where they first appear
  and removed after hydration
- Hidden `v-if` branches are output with `display:none`, so the client can rebuild the condition chain
- Bindings inside `<style>`, `<script>`, `<textarea>` and `<title>` are rendered, but not hydrated
- Rest props on native elements (`<form ${{ method: 'post', action: '?/save', onsubmit }}>`) are output as the
  matching attributes, so they work without JavaScript: `className` is `class`, `htmlFor` is `for`, `ariaLabel` is
  `aria-label`, other names are lowercased; `true` is an empty attribute, `false`, `null` and `undefined` remove it;
  functions and objects are only set on the client

## Server elements

`@server()` on an element class makes it a server element: it is only rendered on the server, the client does not
load its code or hydrate it, so it can use server-only code (`node:fs`, a markdown parser) without shipping it to
the browser. `@lazy()` makes it a lazy view: it is rendered on the server and hydrated normally,
but its code is loaded later (by default on the first interaction, the event is replayed after loading). The code of
a lazy view is bundled into the client (as a separate chunk), so it can only use isomorphic code.
`@client()` makes it a client element, the opposite of a server element, see [Client elements](#client-elements).

The `on` option of `@lazy()` sets when the code is loaded, interacting before it also loads the code and replays the event:
- `interaction` (default): on the first interaction (`pointerdown`, `click`, `focusin`, `keydown`, `input`)
- `load`: after the page is loaded (when the browser is idle after the `load` event), if the element is in the page
- `visible`: when the element enters the viewport (`IntersectionObserver`)

Use `load` or `visible` when the element needs client-side code without interaction, e.g. `@mounted()` fetching
the latest data in a prerendered page (`@server()` methods are not run again for the restored state).

```ts
import { readFile } from 'node:fs/promises';
import { lazy, server } from '@mantou/gem-ssr/decorators';
import { marked } from 'marked';

@customElement('app-markdown')
@shadow()
@server()
class AppMarkdownElement extends GemElement {
  @attribute src: string;

  #state = createState({ html: '' });

  @server()
  #load = async () => this.#state({ html: await marked.parse(await readFile(this.src, 'utf8')) });

  @template()
  #content = () => {
    this.shadowRoot!.innerHTML = this.#state.html;
    return undefined;
  };
}

@customElement('app-like-button')
@lazy({ on: 'visible' })
class AppLikeButtonElement extends GemElement {}
```

They can only be used on the element class with `@customElement` (not on a base class), one element class can only
use one of `@server()`, `@lazy()` and `@client()`, otherwise the build fails.

Both need the `ssr` option of `unplugin-gem` (or `swc-plugin-gem`), the client build rewrites the element module:
- Server element: the class is replaced with `GemServerElement` (only `@customElement` is kept),
  declarations and imports that are no longer used are removed
- Lazy view: the module is replaced with `defineLazy(tag, () => import('./self?gem-lazy'), options)`, so the element
  is a separate chunk. Only use the element through its tag, the module can not have other exports or elements.
  `options` is the argument of `@lazy()`, so it must be a literal, e.g. `{ on: 'visible' }`

`GemServerElement` is imported from the module `server` is imported from, `defineLazy` from the module `lazy` is
imported from.

### Server elements on the client

On the first page, a server element keeps the server output. When it is created on the client (e.g. client navigation)
or its attributes change, it gets the HTML from the loader set with `setServerElementLoader`, the loader receives a key
generated from the tag, attributes and properties, the server renders the element with `renderServerElement`:

```js
import { setServerElementLoader } from '@mantou/gem-ssr/client';

setServerElementLoader(async (key, tag, attrs, props) => {
  const body = JSON.stringify({ url: location.href, tag, attrs, props });
  return fetch('/element', { method: 'POST', body }).then((res) => res.json());
});
```

```js
import { renderServerElement } from '@mantou/gem-ssr';

app.post('/element', async (req, res) => {
  const { url, tag, attrs, props } = req.body;
  // JSON, so the response is not opened as an HTML page
  res.json(await renderServerElement(tag, attrs, props, { url }));
});
```

The `serverElements` option of `render` collects the HTML of the server elements in the page by key,
e.g. to send them with the page data ([gemkit](https://github.com/mantou132/gem/tree/main/packages/gemkit) does this).
- Server elements must not depend on client-only state, the attributes and properties must be JSON values
- Properties are only used when the element is created, prefer attributes
- Interactive child elements are hydrated independently, the properties set by the server element are output as JSON
  and set before they are mounted (values like `Date` and `Map` are converted by JSON), event listeners are not bound
- Lazy views created on the client get the HTML from the loader too, then the code is loaded by the `on` option,
  replaying works for simple events, continuous interactions such as dragging take effect after loading

## Client elements

`@client()` on an element class makes it a client element: the server outputs the tag with its attributes and
children only, the client renders it normally (without hydration). It is the place for browser-only code, e.g. an
editor library that accesses `window` when imported, or `localStorage` at module level:

```ts
import { client } from '@mantou/gem-ssr/decorators';
import { EditorView } from 'browser-only-editor';

const saved = localStorage.getItem('draft');

@customElement('app-editor')
@shadow()
@client()
class AppEditorElement extends GemElement {
  @mounted()
  #init = () => new EditorView({ parent: this.shadowRoot!, doc: saved });
}
```

- The server build of the `ssr` option of `unplugin-gem` (or `swc-plugin-gem`) replaces the element module with an
  empty module, so the module can not have other exports or elements. Without the plugin, the element is still
  output as a plain tag, but the module code runs on the server
- The element is empty until the client code is loaded, style the tag (e.g. a size or a placeholder background)
  to avoid layout shifts, or render a placeholder in its children with Shadow DOM and `<slot>`
- Properties set by the parent template are set after the parent template is hydrated, the element may render
  without them first
- If only part of an element is client-only, render it after mounting instead, so the server and the client render
  the same content first:

  ```ts
  #state = createState({ mounted: false });

  @mounted()
  #onMounted = () => this.#state({ mounted: true });
  ```
