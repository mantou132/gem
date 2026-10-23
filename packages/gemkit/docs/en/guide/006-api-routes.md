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

An API route has no language prefix. `handle` runs before the handler, and `event.path` is the API path.
The context is the same as `load`: `params`, `url`, `request`, `cookies` and `locals`. Cookies set in
the handler are added to the response.

Supported methods are `GET`, `POST`, `PUT`, `PATCH` and `DELETE`. `HEAD` uses `GET` if only `GET` is
exported. Other methods respond `405` with an `Allow` header.

## Responses

- Return a `Response` to control the status, headers and body.
- Return any other value to respond with JSON.
- `redirect(status, location)` responds with the redirect.
- `error(status, message)` responds with `{ status, message }` as JSON.

Thrown unexpected errors respond with the status `500` and a JSON error, and are passed to
`handleError` in `src/app.server.ts` on the server.

## Typed client

`$gemkit/api` is generated from the API routes. Static path segments are properties, dynamic segments
are function calls, and the HTTP methods are the last call. Parameters and results are inferred from the
handlers:

```ts
import { apis } from '$gemkit/api';

const result = await apis.api.likes(slug).POST({ count: 1 });
const res = await apis.api.likes(slug).DELETE();

// Properties can be destructured, the call chain starts at the first dynamic segment.
const { api } = apis;
const likes = await api.likes(slug).GET();
```

- The request is sent to the API path, without the language prefix.
- A JSON response is parsed; other responses give the raw `Response`.
- An `error()` response rejects with `HttpError`, which has `status` and `message`.
- The input is only typed. Validate it in the handler when the shape matters, for example before writing
  it to a database.
- The handler can still read `request` itself, for example `request.formData()`.

## Security

- Cross-site requests with a form content type (`application/x-www-form-urlencoded`, `multipart/form-data`,
  `text/plain`) are rejected (CSRF).
- Other cross-site requests need a CORS preflight. Requests without `Origin`, such as webhooks, are not
  affected.
- Use [`handle`](./007-request.md) for authentication of a group of API routes.

## Deployment

API routes are not prerendered. They are available with `gemkit start` and in development, but not on a
static host.
