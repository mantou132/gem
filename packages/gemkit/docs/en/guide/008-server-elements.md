# Server elements

Gemkit can split a page into parts that are rendered on the server, loaded on demand, or only run in
the browser. The decorators come from
[gem-ssr](https://github.com/mantou132/gem/tree/main/packages/gem-ssr) and are re-exported by
`@mantou/gemkit`.

## `@server()`

A class marked with `@server()` is only rendered on the server. Its code and dependencies are not
bundled into the client, so it can use Node.js APIs and server-only packages. The HTML is kept in the
page, and the client neither loads the code nor hydrates it.

```ts
import { customElement, GemElement, html, template } from '@mantou/gem';
import { server } from '@mantou/gemkit';

@customElement('app-stars')
@server()
class AppStarsElement extends GemElement {
  @template()
  #content = () => html`<span>${countStars()}</span>`;
}
```

There is no client-side behavior after it is rendered. Use it for content that never changes in the
browser and is expensive to send to every user.

`@server()` can also decorate a method or field. It runs during server rendering and its state is
serialized with the element, so hydration can use the result and skip the first execution. The value
must be JSON-serializable.

## `@lazy()`

A `@lazy()` element is rendered on the server, and its HTML is used until the client loads its code
and hydrates it. The code is bundled into a separate client chunk, so it must be isomorphic.

```ts
import { customElement, GemElement } from '@mantou/gem';
import { lazy } from '@mantou/gemkit';

@customElement('app-like-button')
@lazy({ on: 'visible' })
class AppLikeButtonElement extends GemElement {}
```

| `on`            | When the code is loaded                             |
| --------------- | --------------------------------------------------- |
| `'interaction'` | On the first user interaction, the default.         |
| `'load'`        | After the page is loaded, when the browser is idle. |
| `'visible'`     | When the element enters the viewport.               |

When `on` is `'interaction'`, the event that triggered the load is replayed on the original target
(`pointerdown`, `click`, `focusin`, `keydown` or `input`). This keeps the first click from being lost.

Use it for parts that are rarely used, such as a like button or a comment box, to keep the initial
client bundle small.

## `@client()`

A `@client()` element is only rendered on the client. The server outputs the tag only, including its
attributes and child content, and the client renders it normally without hydration. The module can use
browser-only code, even at the top level:

```ts
import { customElement, GemElement } from '@mantou/gem';
import { client } from '@mantou/gemkit';

@customElement('app-editor')
@client()
class AppEditorElement extends GemElement {}
```

Because the module is replaced with an empty module in the server build, it can't contain other
exports or elements.

## How client navigation gets the HTML

On the first load, server element HTML is already in the document. When the page is created on client
navigation, Gemkit fetches the HTML:
1. from the history cache of the current entry, when going back or forward
2. from `<page path>/__elements.json`, which is written when prerendering
3. with one batched `POST /__gemkit_element` request for all elements rendered in the same round

The on-demand request is not available on a static host. If a page with server elements is not
prerendered, client navigation to it needs a server.

`__elements.json` is requested even when a page has no server elements, because the client only knows
after rendering. When prerendering is disabled, the client skips this request and renders elements on
demand.

## Prefetch

When a `<gem-link>` is hovered or focused, Gemkit prefetches the target page modules, its layouts, the
server data (`__data.json`) and the server element HTML (`__elements.json`). The results are used once
within 30 seconds. Back and forward navigation restores the state of the history entry without a
request.

See [Rendering](./010-rendering.md) for the full sequence.

## Security

Server element requests contain a URL, attributes and properties chosen by the client, and any element
can be requested with any URL. Path checks in `handle` don't protect server elements. Check the
permission inside the element:

```ts
import { customElement, GemElement, html, template } from '@mantou/gem';
import { getRequestEvent, server } from '@mantou/gemkit';

@customElement('app-admin-stats')
@server()
class AppAdminStatsElement extends GemElement {
  @template()
  #content = () => (getRequestEvent().locals.user?.admin ? html`...` : html``);
}
```

## Stores

Module-level stores updated while rendering the server element are sent to the client, and hydration
uses the server values. Store state must be JSON-serializable.
