# Deploy

A production build has two parts:

| Output        | Content                                                                                                           |
| ------------- | ----------------------------------------------------------------------------------------------------------------- |
| `dist/web`    | Client assets, prerendered pages, `__data.json`, `__elements.json`, `404.html`, and `.br`/`.gz` files for Node.js |
| `dist/server` | The server bundle and the HTML template used for dynamic rendering                                                |
| `dist/cache`  | Pages with `revalidate`, used by `gemkit start`, see [ISR](#incremental-static-regeneration)                      |

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

### Single-page apps

When the root layout exports [`ssr = false`](./010-rendering.md#client-only-rendering), the build writes
`dist/web/200.html`, which works for every path and is rendered on the client:
- Surge and similar hosts use `200.html` automatically. `404.html` has the same content, so hosts like
  GitHub Pages also show the page (with status 404).
- On Netlify add `/* /200.html 200` to `public/_redirects` (copied to `dist/web` by the build). With Cloudflare
  `"not_found_handling": "single-page-application"`, `index.html` is used, which is the prerendered home page.
- A WebView such as Tauri can load the deployed URL, or use `dist/web` as its frontend directory (the
  entry is the prerendered `index.html`).

Server `load` for paths that aren't prerendered, `actions`, API routes and server elements still need a server. In a single-page app every server element is rendered on demand.

## Node.js

Deploy the whole `dist` directory and run:

```sh
npm run start
```

`gemkit start` serves `dist/web` and renders other requests with `dist/server`. It supports these options and
environment variables:

| Option              | Variable | Description                                           |
| ------------------- | -------- | ----------------------------------------------------- |
| `-p, --port <port>` | `PORT`   | The HTTP port, default `3000`.                        |
| `--host <host>`     | `HOST`   | The address to listen on, all addresses by default.   |
| `--no-compress`     |          | Don't compress dynamic responses, see below.          |
|                     | `ORIGIN` | The public origin, for example `https://example.com`. |

Set `ORIGIN` when the app is behind a reverse proxy. It is used for `url` in `load`, `Secure` cookies and
the same-origin check. Without it, the origin comes from the `Host` header and the connection protocol,
which is HTTP behind a proxy that terminates TLS.
- **Static files**: hashed files in `dist/web/static` use `Cache-Control: public, max-age=31536000, immutable`.
  Other files, including prerendered pages and data files, use `no-cache` with an `ETag`, so a deploy takes
  effect immediately and unchanged files respond with 304. Range requests are supported, for example for
  video.
  The file list of `dist/web` is read at startup and requests don't touch the file system, so files added to
  `dist/web` at runtime are not served.
- **Compression**: the build compresses text files over 1 KB in `dist/web` to `.br` and `.gz`, which are served
  according to `Accept-Encoding`. Dynamically rendered responses are compressed on the fly without buffering
  streamed pages. A reverse proxy or CDN doesn't need to compress again. Compressing on the fly costs
  rendering CPU (about 10-20% lower throughput in tests), so behind a CDN or reverse proxy that compresses,
  turn it off with `gemkit start --no-compress`; files compressed at build time are still used. With a
  [deployment platform](#platforms) the platform compresses and no compressed files are written.
- **Shutdown**: on `SIGTERM` or `SIGINT` the server stops accepting connections and waits for in-flight requests
  and `waitUntil` background tasks, at most 30 seconds, then closes the remaining connections. The process
  exits once nothing else is pending, so close resources the app opened, such as database connections, in
  `process.on('SIGTERM')`.

The server process needs the dependencies of `@mantou/gemkit` and the app at runtime. In a container or a
managed Node host, install production dependencies and set the working directory to the project root
that contains `dist`.

### Custom server

`createApp` from `@mantou/gemkit/node` returns the app used by `gemkit start`, so you can use it in your own
server, for example to add WebSockets or an ISR store shared by several instances:

```ts
// server.ts
import { createServer } from 'node:http';
import { getRequestListener } from '@hono/node-server';
import { createApp } from '@mantou/gemkit/node';

const app = await createApp({ origin: process.env.ORIGIN, isrStore: createRedisStore() });
const server = createServer(getRequestListener(app.fetch));
server.on('upgrade', handleWebSocket);
server.listen(3000);

process.on('SIGTERM', () => server.close(() => app.drain()));
```

- `app.fetch(request)` is a standard fetch handler. Like `gemkit start`, it serves static files, renders pages
  and compresses responses. A Node.js `http` server needs `getRequestListener` from `@hono/node-server` to
  convert it, and so do frameworks like Express.
- `app.drain()` waits for `waitUntil` background tasks, such as ISR regeneration. Use it when closing the
  server.
- Options of `createApp`: `root` is the directory containing `dist`, the current directory by default;
  `origin` is the same as `ORIGIN`; `isrStore` is the ISR storage, files in `dist/cache` by default;
  `compress: false` turns off compressing dynamic responses.

`isrStore` implements `IsrStore`. Keys are paths of pages or data files, for example `/blog/index.html`:

```ts
interface IsrStore {
  /** Content and write time in milliseconds, `undefined` when missing */
  get(file: string): Promise<{ content: string; time: number } | undefined>;
  set(files: Map<string, string>): Promise<unknown>;
  delete(files: string[]): Promise<unknown>;
}
```

## Platforms

When building on Vercel, Netlify or Cloudflare, Gemkit detects the platform and writes the files it needs,
no server required. The platform can also be set with [`adapter`](../reference/001-config.md#adapter), such as `adapter: cloudflare()`.
The platform serves the prerendered files as static files, and its function handles other requests
(pages that can't be prerendered, API routes, `actions` and on-demand server elements).

| Platform   | Output                                    | ISR                         |
| ---------- | ----------------------------------------- | --------------------------- |
| Vercel     | `.vercel/output` (Build Output API)       | Vercel's CDN cache          |
| Netlify    | `.netlify/v1/functions`                   | Netlify's durable CDN cache |
| Cloudflare | `dist/cloudflare/index.js` (Worker entry) | A bound KV namespace        |

### Vercel

The build command is `npm run build`, nothing else to configure. The function uses the Node.js runtime.

### Netlify

Set the static directory in `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist/web"
```

### Cloudflare

Deploy to Workers, with Workers Static Assets for static files. Add `wrangler.jsonc` to the project root:

```jsonc
{
  "name": "my-app",
  "main": "dist/cloudflare/index.js",
  "compatibility_date": "2026-03-01",
  // gem-ssr isolates the state of each request with `AsyncLocalStorage`
  "compatibility_flags": ["nodejs_compat"],
  // Gemkit paths have no trailing `/`
  "assets": { "directory": "dist/web", "html_handling": "drop-trailing-slash" },
  // Optional, the KV used by ISR
  "kv_namespaces": [{ "binding": "GEMKIT_CACHE", "id": "<namespace id>" }]
}
```

Then run `npm run build` and `npx wrangler deploy`. A Worker has no file system, so server code can't read
project files at runtime. Read them at build time (for example when prerendering), or bundle them into the
code.

The Worker `env` (KV, D1, AI, Vectorize and other bindings) and `ctx` are passed to `handle`, `load`,
`actions`, API routes and server elements as [`platform`](./007-request.md#platform).

Other Worker exports go in `src/worker.ts`, which is merged into the Worker entry at build time:
- Handlers in its default export (for example `scheduled`, `queue`) are merged into the Worker default
  export. `fetch` is handled by Gemkit.
- Other exports (for example Durable Object and Workflow classes) are exported as is; bind them in
  `wrangler.jsonc`.

```ts
// src/worker.ts
import { DurableObject } from 'cloudflare:workers';

export class Counter extends DurableObject {
  async increment() {
    const value = ((await this.ctx.storage.get<number>('value')) || 0) + 1;
    await this.ctx.storage.put('value', value);
    return value;
  }
}

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(cleanup(env));
  },
} satisfies ExportedHandler<Env>;
```

`src/worker.ts` is bundled by Wrangler, not Rsbuild, so it can import `cloudflare:workers`, but it has no
Gem compilation or auto imports, and its modules are separate instances from the app server code.

### ISR

- On Vercel and Netlify, the CDN caches pages that set `revalidate`: responses carry a CDN cache header with
  `stale-while-revalidate`, so after expiry the CDN returns the old content and requests the function to
  rerender in the background. `revalidatePath` can't purge the CDN cache, the page updates once it expires.
- On Cloudflare with a `GEMKIT_CACHE` KV binding, pages and data files are cached like `gemkit start` does,
  and rerendered in `waitUntil`. Without the binding every request is rendered.

### Custom adapters

Other platforms can implement `GemkitAdapter`, which has two parts:
- `runtime`: the runtime module (a package name or an absolute path), bundled by the server build. It exports
  `createHandler(renderer, template)` and returns the handler the platform needs. It usually uses
  `createFetchHandler` from `@mantou/gemkit/handler`, which handles pages, data, forms, server elements and
  API routes, with options for what differs between platforms: `readStatic` (read prerendered files, not
  needed when the platform serves static files first), `isrStore` (the ISR storage) or `cdnCache` (the
  response header when the CDN caches ISR pages). The handler takes the platform [`{ env, ctx }`](./007-request.md#platform) as its second argument.
- `write(ctx)`: writes the files the platform needs after the build. `ctx.handlerFile` is the function entry
  of the server build, which has a named export `createHandler(template)`; the platform entry calls it with
  `ctx.template`. `ctx.webDir` is the directory to serve as static files, `ctx.srcDir` is the source directory, and `ctx.cacheDir` has the files
  prerendered at build time for pages that set `revalidate`, which a platform can use as the initial ISR cache.

```ts
// my-adapter/runtime.ts
import { createFetchHandler } from '@mantou/gemkit/handler';
import type { Renderer } from '@mantou/gemkit/server';

export function createHandler(renderer: Renderer, template: string) {
  return createFetchHandler(renderer, template);
}
```

```ts
// my-adapter/index.ts
import fs from 'node:fs';
import path from 'node:path';
import type { GemkitAdapter } from '@mantou/gemkit/plugin';

export const myAdapter = (): GemkitAdapter => ({
  name: 'my-platform',
  runtime: 'my-adapter/runtime',
  write({ distDir, handlerFile, template }) {
    const file = path.join(distDir, 'my-platform/server.mjs');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(
      file,
      `import { createHandler } from ${JSON.stringify(handlerFile)};\n` +
        `export default createHandler(${JSON.stringify(template)});\n`,
    );
  },
});
```

The server build is CommonJS without split chunks, so a platform can run it directly or bundle it again.

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
- The cache is in `dist/cache` and is cleared on every build. It isn't shared between server instances.
  Where the file system isn't writable, such as serverless, the platform's cache is used, see [ISR](#isr).

Content that must be live, such as price or stock, belongs in an API route requested by the client, or in a
server element rendered on demand.

## Caching

Gemkit sets `Cache-Control: private, no-store` on responses that read the request or cookies, or set
cookies, so a CDN doesn't share personal content. Keep that header when configuring a proxy.

Dynamically rendered responses can set `Cache-Control` and other headers with
[`setHeaders`](./007-request.md#response-headers). Prerendered files are served by the static server or the
platform without them, so configure their headers on the platform.

Prerendered HTML and `__data.json` are public files, but a new deploy replaces them at the same path.
Pages already open during a deploy don't mix the two versions, see [Redeploying](./010-rendering.md#redeploying).
Use a short cache lifetime or purge the cache after deploying. Hashed assets in `dist/web/static` never
change, so they can be cached for a long time. `gemkit start` sets these headers.

## What changes between environments

- Development renders every request and has HMR.
- A production build prerenders pages and enables `process.env.GEMKIT_PRERENDER`.
- `prerender = false` pages, ISR, API routes, `actions` and on-demand server elements need `gemkit start`,
  the function of a [platform](#platforms), or another server that runs the Gemkit handler.
- Behavior with a query string differs between a static host and `gemkit start`, see above.
