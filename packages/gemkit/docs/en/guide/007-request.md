# Request

Server code can read the current request, set cookies, redirect and share data between handlers.
The same APIs are available in `load`, `actions`, API routes and server elements.

## Request hook

`src/app.server.ts` can export `handle`. Every request Gemkit handles goes through it: pages, `__data.json`,
form actions, server elements and API routes. `resolve()` produces Gemkit's response. `handle` returns it,
optionally after modifying it, or returns another response without calling `resolve()`.

```ts
// src/app.server.ts
import type { Handle } from '@mantou/gemkit';

declare module '@mantou/gemkit' {
  interface Locals {
    user?: User;
  }
}

export const handle: Handle = async (event, resolve) => {
  if (event.path.startsWith('/admin')) {
    event.locals.user = await getUser(event.cookies.get('token'));
    if (!event.locals.user) redirect(302, '/login');
  }
  return resolve();
};
```

| Field        | Description                                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `url`        | The page URL, including the language prefix.                                                                                               |
| `path`       | The page path without the language prefix, matched by the routes.                                                                          |
| `request`    | The current `Request`. Not available when prerendering.                                                                                    |
| `cookies`    | The request cookies. Not available when prerendering.                                                                                      |
| `locals`     | Data shared with `load`, `actions`, API routes and server elements in the same request.                                                    |
| `platform`   | Environment variables, bindings and `waitUntil` of the platform, see [Platform](#platform). Not available when prerendering at build time. |
| `setHeaders` | Sets response headers, see [Response headers](#response-headers).                                                                          |

Use `path` rather than `url.pathname` for route checks. `url` is the page URL, also for
`__data.json` and server element requests.

### Before `resolve()`

`redirect()` and `error()` called before `resolve()` behave as they do in `load`: the request type decides
the response. A page redirects or renders the error page, `__data.json` contains the location or the error,
and an API route redirects or responds with a JSON error. Headers set with `setHeaders` before that are
still added to the response.

Requests that don't need Gemkit to render can be answered directly, for example a health check or a
maintenance page:

```ts
export const handle: Handle = (event, resolve) => {
  if (event.path === '/healthz') return new Response('ok');
  return resolve();
};
```

### After `resolve()`

The response returned by `resolve()` can be modified, for example to add headers or log the status and
duration:

```ts
export const handle: Handle = async (event, resolve) => {
  const start = performance.now();
  const response = await resolve();
  response.headers.set('server-timing', `app;dur=${performance.now() - start}`);
  event.platform?.ctx.waitUntil(log(event.path, response.status));
  return response;
};
```

- Pages are streamed. `resolve()` returns once the page data and title are ready, so the status and headers
  are final while the rest of the content is still being sent.
- An error thrown after `resolve()` does not render the error page; the request fails.

### Composing `handle`

There is one `handle`. Compose several in order:

```ts
const sequence =
  (...handles: Handle[]): Handle =>
  (event, resolve) =>
    handles.reduceRight<() => Promise<Response>>(
      (next, handle) => async () => handle(event, next),
      resolve,
    )();

export const handle = sequence(securityHeaders, auth, logger);
```

### Which requests run `handle`

- Every request Gemkit renders runs `handle`, including prerendering and ISR regeneration.
- Prerendered files, ISR cached files and other static files don't run `handle`; the static server or the
  platform serves them directly. Configure their headers on the platform, for example Netlify `_headers`
  or `headers` in `vercel.json`.
- `handle` also runs while prerendering. Reading `request` or `cookies` (also after `resolve()`), or
  redirecting or throwing before `resolve()`, prevents the page from being prerendered. Read them only for
  the paths that need them; prerendered pages are public.

### Authentication

`locals` is an empty interface. Extend it with `declare module` to type the values you put in it.
It is per request, so it is safe for user data.
- Check authentication in `handle` instead of a layout `load`. A layout `load` does not run for form
  actions and server elements, and in `__data.json` the page `load` runs in parallel with it, even when
  the layout redirects.
- When neither the page nor its layouts have a server `load`, client navigation sends no request, so
  `handle` does not run. The page data is embedded in the document at first load and on client
  navigation the page is rendered from local data. These pages have no server data, and `handle` still
  runs when `actions` are submitted, so no data leaks.
- For an area that requires login to redirect to the login page as soon as you navigate into it, export
  a `load` from its `_layout.server.ts` (for example returning the current user). Client navigation into
  it then requests data, so `handle` runs and redirects. Keep the permission check in `handle`:

```ts
// src/pages/admin/_layout.server.ts
export const load = ({ locals }: ServerLoadContext) => ({ user: locals.user });
```

## Response headers

`setHeaders` sets response headers. It is on the event in `handle`, `load`, `actions`, API routes and the
one returned by `getRequestEvent()`:

```ts
// src/app.server.ts
export const handle: Handle = (event, resolve) => {
  event.setHeaders({
    'x-frame-options': 'DENY',
    'referrer-policy': 'strict-origin-when-cross-origin',
  });
  return resolve();
};
```

```ts
// src/pages/blog/[slug].server.ts
export async function load({ params, setHeaders }: ServerLoadContext<{ slug: string }>) {
  setHeaders({ 'cache-control': 'public, max-age=60' });
  return getPost(params.slug);
}
```

- A header replaces the one set before with the same name. Headers of a `Response` returned by an API
  route take precedence.
- Responses that read the request or cookies, or set cookies, default to `Cache-Control: private, no-store`.
  `setHeaders` can override it, and then it's up to you that a CDN doesn't share the content between users.
- Use `cookies.set` for cookies; setting `Set-Cookie` with `setHeaders` throws.
- Like cookies, headers set after the document starts streaming (for example in a `@server()` method) are
  ignored.
- Prerendered files have no response headers, see [Which requests run `handle`](#which-requests-run-handle).

## getRequestEvent

`getRequestEvent()` returns the event of the current request, the same as the argument of `handle`. It is
scoped to the current request and throws outside a server request. Use it in server elements and other server-only
code that doesn't receive the context as an argument:

```ts
const { locals } = getRequestEvent();
```

## Platform

`platform` is the `{ env, ctx }` provided by the deployment platform. `handle`, `load`, `actions`, API
routes and server elements can all read it:

| Platform            | `env`                                                     | `ctx`                                                          |
| ------------------- | --------------------------------------------------------- | -------------------------------------------------------------- |
| Cloudflare          | The Worker `env`, including KV, D1, AI and other bindings | `ExecutionContext`                                             |
| Netlify             | `process.env`                                             | The Netlify `Context`                                          |
| Vercel              | `process.env`                                             | Only `waitUntil`                                               |
| `gemkit start`, dev | `process.env`                                             | Only `waitUntil`, the process keeps running after the response |

`ctx.waitUntil(promise)` keeps a background task running after the response, for example logging or
analytics. The type of `env` is the empty interface `PlatformEnv`, extend it with `declare module`:

```ts
// src/app.server.ts
declare module '@mantou/gemkit' {
  interface PlatformEnv {
    DB: D1Database;
    AI: Ai;
  }
}

// src/pages/posts/[id].server.ts
export async function load({ params, platform }: ServerLoadContext<{ id: string }>) {
  return platform!.env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(params.id).first();
}
```

Prerendering at build time has no platform, so `platform` is `undefined`. Pages that need it export
`prerender = false` or use [ISR](./011-deploy.md#incremental-static-regeneration), which renders with the
`platform` of the request that triggers it.

## Errors and redirects

`error(status, message?)` throws an error that renders the [error page](./001-routing.md#error-page).
`notFound()` is `error(404, 'Not Found')`. In `load`, the error page is rendered at the position of the
failed page or layout; outer layouts stay.

`redirect(status, location)` throws and responds with a redirect:

```ts
redirect(302, '/login');
```

`location` is the full path, including the language prefix. On the server the response has the status
and a `Location` header. On client navigation the data file contains the location and Gemkit navigates
to it. Prerendered redirects become `<meta http-equiv="refresh">` pages, so they work on a static host.

Unexpected errors (not thrown by `error()`) are passed to `handleError` on the server:

```ts
// src/app.server.ts
export function handleError(error: unknown, event: RequestEvent) {
  reportError(error, event.url);
}
```

The default handler is `console.error`. The error page shows status `500`; in production the message is
`Internal Error`. Unexpected errors during prerendering fail the build, so a broken page is not published.

On client navigation, unexpected errors from `load`, loading page modules or data are passed to
`handleError` in `src/app.client.ts`, for example to report them to an error monitoring service:

```ts
// src/app.client.ts
import type { AppClientModule } from '@mantou/gemkit';

export const handleError: AppClientModule['handleError'] = (error, { url, path }) => {
  reportError(error, url);
};
```

- Gemkit catches these errors and renders the error page, so they don't reach the `error` and
  `unhandledrejection` events of `window`, and a monitoring SDK can't collect them automatically. Report
  them here.
- Other errors, for example in element templates or event handlers, are not caught and still reach the
  `window` events and the monitoring SDK.
- `url` is the page URL and `path` is without the language prefix. The default handler is `console.error`.

## Cookies

```ts
import type { ServerLoadContext } from '@mantou/gemkit';

export const prerender = false;

export function load({ cookies }: ServerLoadContext) {
  const theme = cookies.get('theme');
  cookies.set('theme', 'dark', { maxAge: 60 * 60 * 24 * 365 });
  return { theme };
}
```

`cookies.set(name, value, options)` and `cookies.delete(name, options)` add `Set-Cookie` headers to the
response. Defaults are `Path=/; HttpOnly; SameSite=Lax`, and `Secure` on HTTPS. `maxAge` is in seconds.
`get` sees the value set earlier in the same request.

Cookies set after the response document has started to stream (for example in a `@server()` method) are
ignored. Set them in `handle`, `load` or `actions`.

Responses that read `request` or `cookies`, or set cookies, have `Cache-Control: private, no-store`, so a
CDN does not share them between users.

## Prerendering

The request is not available while prerendering. Export `prerender = false` from the page or layout
server module when the page or its layout reads the request or cookies:

```ts
// src/pages/account.server.ts
export const prerender = false;
```

In a layout, it applies to all pages below it.
