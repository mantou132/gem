# Request

Server code can read the current request, set cookies, redirect and share data between handlers.
The same APIs are available in `load`, `actions`, API routes and server elements.

## Request hook

`src/app.server.ts` can export `handle`, which runs before every server request: pages, `__data.json`,
form actions, server elements and API routes.

```ts
// src/app.server.ts
import { type RequestEvent, redirect } from '@mantou/gemkit';

declare module '@mantou/gemkit' {
  interface Locals {
    user?: User;
  }
}

export async function handle(event: RequestEvent) {
  if (!event.path.startsWith('/admin')) return;

  event.locals.user = await getUser(event.cookies.get('token'));
  if (!event.locals.user) redirect(302, '/login');
}
```

| Field     | Description                                                                             |
| --------- | --------------------------------------------------------------------------------------- |
| `url`     | The page URL, including the language prefix.                                            |
| `path`    | The page path without the language prefix, matched by the routes.                       |
| `request` | The current `Request`. Not available when prerendering.                                 |
| `cookies` | The request cookies. Not available when prerendering.                                   |
| `locals`  | Data shared with `load`, `actions`, API routes and server elements in the same request. |

Use `path` rather than `url.pathname` for route checks. `url` is the page URL, also for
`__data.json` and server element requests.

`locals` is an empty interface. Extend it with `declare module` to type the values you put in it.
It is per request, so it is safe for user data.
- Check authentication in `handle` instead of a layout `load`. A layout `load` does not run for form
  actions and server elements, and in `__data.json` the page `load` runs in parallel with it, even when
  the layout redirects.
- `handle` also runs while prerendering. Reading `request` or `cookies`, redirecting or throwing there
  prevents the page from being prerendered. Read them only for the paths that need them; prerendered
  pages are public.
- Client navigation to a page without a server module sends no request, so `handle` does not run.
  The page data is embedded in the document at first load and on client navigation the page is
  rendered from local data.

## getRequestEvent

`getRequestEvent()` returns the current `{ url, path, request, cookies, locals }`. It is scoped to the
current request and throws outside a server request. Use it in server elements and other server-only
code that doesn't receive the context as an argument:

```ts
import { getRequestEvent } from '@mantou/gemkit';

const { locals } = getRequestEvent();
```

## Errors and redirects

`error(status, message?)` throws an error that renders the [error page](./001-routing.md#error-page).
`notFound()` is `error(404, 'Not Found')`. In `load`, the error page is rendered at the position of the
failed page or layout; outer layouts stay.

`redirect(status, location)` throws and responds with a redirect:

```ts
import { redirect } from '@mantou/gemkit';

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
