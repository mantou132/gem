# API routes

A `*.server.ts` in `src/pages` without a page module of the same name is an API route.
It exports handlers named by the HTTP methods.

```ts
// src/pages/api/likes/[slug].server.ts -> /api/likes/:slug
import type { ServerLoadContext } from '@mantou/gemkit';

type Context = ServerLoadContext<{ slug: string }>;

// Other values than `Response` are responded as JSON.
export const GET = ({ params }: Context) => ({ likes: getLikes(params.slug) });

// The second parameter is the input: the query of `GET` and `DELETE`,
// the JSON body of other methods.
export const POST = ({ params }: Context, input: { count: number }) => ({
  likes: addLikes(params.slug, input.count),
});

export const DELETE = () => new Response(null, { status: 204 });
```

## File mapping

| File                                   | URL                |
| -------------------------------------- | ------------------ |
| `src/pages/api/likes/[slug].server.ts` | `/api/likes/:slug` |
| `src/pages/api/likes/index.server.ts`  | `/api/likes`       |
| `src/pages/rss.xml.server.ts`          | `/rss.xml`         |

The build fails when an API route and a page have the same path, because the API route matches first and
the page would only be reachable by client navigation.

An API route has no language prefix. `handle` runs before the handler, and `event.path` is the API path.
The context is the same as `load`: `params`, `url`, `request`, `cookies` and `locals`. Cookies set in
the handler are added to the response.

Supported methods are `GET`, `POST`, `PUT`, `PATCH` and `DELETE`. `HEAD` uses `GET` if only `GET` is
exported. Other methods respond `405` with an `Allow` header.

## Responses

- Return a `Response` to control the status, headers and body.
- Return any other value to respond with JSON.
- `redirect(status, location)` responds with the redirect; a `$gemkit/api` call navigates on the client.
- `error(status, message)` responds with `{ status, message }` as JSON.

Thrown unexpected errors respond with the status `500` and a JSON error, and are passed to
`handleError` in `src/app.server.ts` on the server.

## Typed client

`$gemkit/api` is generated from the API routes. Static path segments are properties, dynamic segments
are function calls, and the HTTP methods are the last call. Parameters and results are inferred from the
handlers:

```ts
const result = await apis.api.likes(slug).POST({ count: 1 });
const res = await apis.api.likes(slug).DELETE();

// Properties can be destructured, the call chain starts at the first dynamic segment.
const { api } = apis;
const likes = await api.likes(slug).GET();
```

- The request is sent to the API path, without the language prefix.
- A JSON response is parsed; other responses give the raw `Response`.
- An `error()` response rejects with `HttpError`, which has `status`, `message` and the `issues` of schema
  validation.
- When the handler or `handle` redirects, the client clears prefetched results and the history cache,
  navigates to the location, and the call does not resolve. The request has the `x-gemkit-client` header, and
  the server responds with `x-gemkit-redirect` instead of 3xx, because `fetch` follows redirects.
- The input is only typed. Validate it with [`endpoint`](#validate-input), or in the handler, for example
  before writing it to a database.
- The handler can still read `request` itself, for example `request.formData()`.

## Reload data

After a mutation through an API route, the results of the page and layout `load` are stale. `invalidate()`
reloads them without reloading the page:

```ts
await apis.api.likes(slug).POST({ count: 1 });
await invalidate();
```

- The page element is reused, so input state is kept, and the scroll position does not change.
- Prefetched results and the history cache are not used anymore, and layouts reload their data too.
- It resolves after the page is rendered.

## Validate input

`endpoint(schema, handler)` validates and transforms the input with a
[Standard Schema](https://standardschema.dev) (zod, valibot, arktype and others):

```ts
// src/pages/api/posts/[slug].server.ts
import { z } from 'zod';

export const GET = endpoint(z.object({ page: z.coerce.number() }), ({ params }, { page }) =>
  getComments(params.slug, page),
);
```

- When validation fails, it responds `400` and the `issues` of `HttpError` are the validation issues.
- Query values are strings; use a schema transform such as `z.coerce.number()` to convert them.
- The input type of `$gemkit/api` is the output type of the schema: the client passes the values the handler
  expects, they become strings in the query, and the schema transforms them back.

## Security

- Cross-site requests with a form content type (`application/x-www-form-urlencoded`, `multipart/form-data`,
  `text/plain`) are rejected (CSRF).
- Other cross-site requests need a CORS preflight. Requests without `Origin`, such as webhooks, are not
  affected.
- Use [`handle`](./007-request.md) for authentication of a group of API routes.

## Deployment

API routes are not prerendered. They are available with `gemkit start` and in development, but not on a
static host.
