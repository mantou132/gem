# Deploy

A production build has two parts:

| Output        | Content                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------- |
| `dist/web`    | Client assets, prerendered pages, `__data.json`, `__elements.json`, `404.html`               |
| `dist/server` | The server bundle and the HTML template used for dynamic rendering                           |
| `dist/cache`  | Pages with `revalidate`, used by `gemkit start`, see [ISR](#incremental-static-regeneration) |

Run the build in the project:

```sh
npm run build
```

The starter defines `dev`, `build` and `start` scripts, so the same commands work with pnpm or yarn.

## Static hosting

Deploy `dist/web` to a static host such as Netlify, Cloudflare Pages or an object storage with a CDN.
- Routes are directories with an `index.html`, so no SPA rewrite is needed.
- Use the generated `404.html` for unmatched paths. Most static hosts do this automatically.
- Cache hashed files under `/static/` (and other immutable assets) for a long time. Don't cache HTML and
  data files with the same rule, so a deploy is visible immediately.
- Redirects are written as `<meta http-equiv="refresh">` pages. Client navigation reads the `redirect`
  field from the data file.
- `prerender = false` pages, pages with `revalidate`, API routes and form `actions` are not available.
- Server elements rendered on demand are not available. Only the HTML collected in `__elements.json`
  during prerendering is available.

Static hosting ignores the query when serving a file. If a page `load` reads `url.searchParams`, it needs
a server. `gemkit start` handles this by rendering requests with a query instead of using the prerendered
file.

A page without a server module is rendered from the data embedded in the document on first load and
from local data on client navigation, so it works fully on a static host.

## Node.js

Deploy the whole `dist` directory and run:

```sh
npm run start
```

`gemkit start` serves `dist/web` and renders other requests with `dist/server`. It supports the `-p, --port <port>` option or uses:
- `PORT`: the HTTP port, default `3000`
- `ORIGIN`: the public origin, for example `https://example.com`

Set `ORIGIN` when the app is behind a reverse proxy. It is used for `url` in `load`, `Secure` cookies and
the same-origin check. Without it, the origin comes from the `Host` header and the connection protocol,
which is HTTP behind a proxy that terminates TLS.

The server process needs the dependencies of `@mantou/gemkit` and the app at runtime. In a container or a
managed Node host, install production dependencies and set the working directory to the project root
that contains `dist`.

## Incremental static regeneration

Pages such as products or articles are numerous and change over time, so prerendering all of them at build
time doesn't fit. Export `revalidate` (seconds) from the server module:

```ts
// src/pages/products/[id].server.ts
export const revalidate = 60;

export const paths = async () => (await getHotProducts()).map(({ id }) => ({ id }));

export async function load({ params }: ServerLoadContext<{ id: string }>) {
  return getProduct(params.id);
}
```

- `paths` only returns the popular pages, which are prerendered at build time. Other pages are prerendered
  and cached by `gemkit start` on the first request.
- When the cache is older than `revalidate` seconds, the old content is returned and the page is rerendered
  in the background, at most once at a time per page.
- The page, `__data.json` and `__elements.json` are cached together, so client navigation uses the cache
  too and doesn't need on-demand server elements.
- The conditions are the same as for prerendering: pages that read the request or cookies, requests with a
  query, and results other than 200, such as redirects and errors, are not cached and are rendered on the
  server.
- After a mutation, call `revalidatePath(pathname)` in an action or an API route to clear the cache, so the
  next request rerenders the page.
- The cache is in `dist/cache` and is cleared on every build. It isn't shared between server instances,
  and doesn't work where the file system isn't writable, such as serverless.

Content that must be live, such as price or stock, belongs in an API route requested by the client, or in a
server element rendered on demand.

## Caching

Gemkit sets `Cache-Control: private, no-store` on responses that read the request or cookies, or set
cookies, so a CDN doesn't share personal content. Keep that header when configuring a proxy.

Prerendered HTML and `__data.json` are public files, but a new deploy replaces them at the same path.
Use a short cache lifetime or purge the cache after deploying. Hashed assets in `dist/web/static` never
change, so they can be cached for a long time.

## What changes between environments

- Development renders every request and has HMR.
- A production build prerenders pages and enables `process.env.GEMKIT_PRERENDER`.
- `prerender = false` pages, ISR, API routes, `actions` and on-demand server elements need `gemkit start` or
  another server that runs the Gemkit handler.
- Behavior with a query string differs between a static host and `gemkit start`, see above.
