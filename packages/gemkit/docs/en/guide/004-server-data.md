# Server data

Server-only data is loaded in a sibling `*.server.ts` file. It is never bundled into the client, and its
result is sent to the client as JSON.

```
src/pages/blog/[slug].ts
src/pages/blog/[slug].server.ts
```

## `load`

```ts
// src/pages/blog/[slug].server.ts
import { readFile } from 'node:fs/promises';

export async function load({ params }: { params: { slug: string } }) {
  return { markdown: await readFile(`content/${params.slug}.md`, 'utf8') };
}
```

```ts
// src/pages/blog/[slug].ts
@page<{ slug: string }, { markdown: string }>({
  load: ({ data }) => parseMarkdown(data.markdown),
})
export default class PostPage extends GemElement {
  @property data?: { html: string };

  @template()
  #content = () => html`<article .innerHTML=${this.data?.html}></article>`;
}
```

The result must be JSON-serializable. It is passed to the page or layout as `data`, and to the page
`load` as the `data` argument.
- **Server rendering**: the data is embedded into the HTML, hydration uses it without another request.
- **Client navigation**: Gemkit requests `<page path>/__data.json`, which contains the data of the page
  and all its layouts.
- **Prerendering**: the data file is written next to the page, so client navigation works on a static host.
- **Redirect or error**: if the server `load` calls `redirect()` or `error()`, the page is not rendered.
  See [Request](./007-request.md).

Importing a `*.server.ts` module from client code fails the build, so server-only packages and Node.js
APIs are safe to use there.

## Dynamic paths

For a dynamic route, the list of paths to prerender is exported as `paths`. It is called for each
language with `{ lang }`:

```ts
// src/pages/blog/[slug].server.ts
export async function paths({ lang }: { lang: string }) {
  return (await getPosts(lang)).map(({ slug }) => ({ slug }));
}
```

The same option can be defined on the page, which is useful when no server module is needed. See
[dynamic paths](./002-pages.md#dynamic-paths).

## Skip prerendering

Export `prerender = false` from the server module when the page depends on the request:

```ts
// src/pages/account.server.ts
import type { ServerLoadContext } from '@mantou/gemkit';

export const prerender = false;

export function load({ cookies }: ServerLoadContext) {
  return { user: cookies.get('user') ?? null };
}
```

Prerendering runs without a request, so `request` and `cookies` throw there. When `handle` reads them,
the page is not prerendered. A page whose `load` needs them must export `prerender = false`; otherwise
rendering it at build time fails. The same applies to a layout server module, where `prerender = false`
covers every page under the layout.

## Request, cookies and redirects

The `load` context contains `params`, `url`, `request`, `cookies` and `locals`:

```ts
// src/pages/editor.server.ts
import type { ServerLoadContext } from '@mantou/gemkit';

export const prerender = false;

export function load({ cookies }: ServerLoadContext) {
  if (!cookies.get('token')) redirect(302, '/login');
  return { draft: loadDraft(cookies.get('token')) };
}
```

`redirect(status, location)` throws and stops rendering. `location` is a full path including the
language prefix. On the server the response has that status and a `Location` header; on client navigation
Gemkit navigates to it instead. Prerendered redirects are written as `<meta http-equiv="refresh">` pages,
and their data file contains the location, so they also work on a static host.

`cookies.set` and `cookies.delete` add a `Set-Cookie` header to the response. Responses that read the
request or cookies, or set cookies, use `Cache-Control: private, no-store`. See
[Request](./007-request.md) for details.

## Query parameters

A prerendered file is the same for every query string. If `load` reads `url.searchParams`, the page can't
be prerendered. `gemkit start` renders requests with a query at runtime, but a static host ignores the
query and serves the prerendered file. Such pages need a server, or should keep the state in the path.

## Server stores

Module-level stores updated on the server, for example in a `@server()` method, are sent to the client
automatically. Hydration uses the server values, so the first render matches the HTML. Only JSON values
are supported.
