# gemkit

Gem application framework based on [Rsbuild](https://rsbuild.rs): file-based routing, layouts, i18n, SSR and SSG.

## Usage

```ts
// rsbuild.config.ts
import { pluginGemkit } from '@mantou/gemkit/plugin';
import { defineConfig } from '@rsbuild/core';

export default defineConfig({
  plugins: [pluginGemkit({ title: 'My Site', titleTemplate: '%s | My Site' })],
});
```

- `rsbuild dev`: dev server with SSR and HMR
- `rsbuild build`: build `dist/web` (client, prerendered pages) and `dist/server` (SSR bundle)
- `gemkit start`: serve `dist`, prerendered pages first, otherwise SSR. Environment variables:
  - `PORT`: default `3000`
  - `ORIGIN`: the site origin, e.g. `https://example.com`, set it behind a reverse proxy, otherwise the origin comes
    from the `Host` header and the connection protocol, it is used by `url` in `load`, `Secure` cookies and
    the same-origin check

SSR responses are streamed: the document is sent once the page `load` and `title` are resolved,
async content inside the page (e.g. `@server` methods) is streamed after it.

How each scenario is rendered (first load, hydration, navigation, back/forward, actions) and why:
[docs/rendering.md](docs/rendering.md) (Chinese).

## Project structure

```
src/
  app.ts               optional, imported before pages (global styles, stores)
  app.server.ts        optional, `handle` runs before every server request
  index.html           optional HTML template, use `<!--gemkit-body-->` as the content placeholder
  pages/
    _layout.ts         root layout, render `<gemkit-outlet>` for child routes
    _error.ts          error page, also the 404 page of unmatched paths
    index.ts           /
    about.ts           /about
    blog/
      _layout.ts       nested layout, kept when navigating between /blog/* pages
      index.ts         /blog
      [slug].ts        /blog/:slug
      [...rest].ts     /blog/*
  locales/
    en.json            default language, no path prefix
    zh.json            /zh/*
```

- `srcDir`: the directory of the structure above, relative to the project root, default `src`. It can be a directory
  of another package, e.g. a framework providing the pages, `.gemkit` and `dist` are still in the project root
- `prefixDefaultLanguage`: the default language also has the path prefix (`/en/about`), paths without the prefix
  redirect to the default language, prerendered as redirect pages too

Pages and layouts default export a Gem element, the tag name is generated from the file path:

```ts
import { GemElement, html, property, template } from '@mantou/gem';
import { page } from '@mantou/gemkit';

@page<{ slug: string }, Post | undefined>({
  // runs on the server and on client-side navigation, use isomorphic APIs,
  // the SSR result is sent to the client for hydration, so it must be a JSON value,
  // put server-only code in `*.server.ts`
  load: ({ params }) => getPost(params.slug),
  title: ({ data }) => data?.title || 'Not Found',
  // `<meta>` of the page, see below
  meta: ({ data }) => ({ description: data?.summary, 'og:image': data?.cover }),
  // params of the dynamic route to prerender
  paths: () => posts.map(({ slug }) => ({ slug })),
})
export default class PostPage extends GemElement {
  @property data?: Post;

  @template()
  #content = () => html`<h1>${this.data?.title}</h1>`;
}
```

`load` receives `{ params, data }`, `data` is the result of the `load` of the sibling `*.server.ts`
(see [Server data](#server-data)), `title` and `meta` receive `{ params, data }`, `data` is the result of `load`.

When the params change on client navigation (e.g. `/blog/a` to `/blog/b`), the page element is recreated, the elements
and their state in the page are not reused. When only the query changes or the data is reloaded after a form
submission, the page element is reused and gets the new `data`.

## Meta

The `meta` option of pages and layouts (an object or a function of `params` and `data`) is rendered into `<head>`
and updated on client navigation:

- keys containing `:` (e.g. `og:image`) are rendered as `property`, others as `name`, `undefined` values are skipped
- metas of the layouts and the page are merged, inner ones override the same keys,
  e.g. set the site-wide defaults in the root layout
- don't put the same `<meta>` in `index.html`, the page one is added, not replacing it

## Error page

`error(status, message?)` throws in `handle`, `load` (client or server) and `actions`, `notFound()` is `error(404, 'Not Found')`.
`src/pages/_error.ts` is rendered with the error as `data`, the URL is kept and the response has the status:

```ts
// src/pages/_error.ts
import { GemElement, html, property, template } from '@mantou/gem';
import { type ErrorData, page } from '@mantou/gemkit';

@page<{}, ErrorData>({ title: ({ data }) => `Error ${data.status}` })
export default class ErrorPage extends GemElement {
  @property data?: ErrorData;

  @template()
  #content = () => html`<h1>${this.data?.status}</h1><p>${this.data?.message}</p>`;
}
```

- it is rendered in place of the failed page or layout, the outer layouts are kept;
  errors in `handle` are rendered in place of the first route that has a `*.server.ts`, otherwise the page;
  paths not matched are rendered as 404 in place of the page
- other errors are unexpected, the status is 500, the message is `Internal Error` in production.
  On the server they are passed to `handleError` of `src/app.server.ts` (default `console.error`) to log or report:

  ```ts
  // src/app.server.ts
  import type { RequestEvent } from '@mantou/gemkit';

  export function handleError(error: unknown, event: RequestEvent) {
    reportError(error, event.url);
  }
  ```

- unexpected errors fail the build when prerendering, `error()` pages are prerendered as the page
- an action error renders the error page in place of the page: `submitAction` renders it on the client,
  without JS the response is the error page
- without `_error.ts`, errors are not handled, e.g. SSR responds 500

## Store

Module level stores updated on the server (e.g. in `@server` methods) are sent to the client automatically,
hydration uses the server values. Only JSON values are supported.

## Server elements

`@server()` element classes are only rendered on the server, their code and dependencies are not bundled into the
client, `@lazy()` elements are loaded on the first interaction, after the page is loaded (`@lazy({ on: 'load' })`)
or when visible (`@lazy({ on: 'visible' })`), their code is bundled into the client, so only isomorphic code can
be used, see
[gem-ssr](https://github.com/mantou132/gem/tree/main/packages/gem-ssr#server-elements).

On client navigation, the HTML of the server elements (including lazy elements, whose code is still loaded by the
`on` option) in the page is fetched from `<page path>/__elements.json` (written next to the page when
prerendering, not requested in dev or with `prerender: false`), elements not in it (e.g. pages not prerendered,
elements shown after interaction) are rendered by the server on demand in one batched request, which is not
available on a static host.

## Prefetch

When a `<gem-link>` is hovered or focused, the modules of the target page and its layouts, the server data
(`__data.json`, only when needed) and the server elements (`__elements.json`, only when prerendering) are prefetched,
the prefetched results are used once within 30 seconds. On navigation, they are requested in parallel.

Back/forward navigation restores the data and the server element HTML of the history entry as it was left, without
any request (the latest 50 entries are kept, a form submission clears them).

## Scroll restoration

After the page renders, the window scrolls to the top on new history entries (unless the URL has a hash),
back/forward restores the previous position once the server elements in the page have their HTML,
re-rendering the same entry (e.g. after a form submission) keeps it.

## Layout data

Layouts can load data like pages, it is passed to the layout as `params` (without the child route part) and `data`.
When navigating between child routes, the data is reused as long as the layout params are unchanged:

```ts
// src/pages/blog/_layout.ts
import { GemElement, html, property, template } from '@mantou/gem';
import { layout } from '@mantou/gemkit';

@layout({ load: () => fetch('/api/categories').then((res) => res.json()) })
export default class BlogLayout extends GemElement {
  @property data?: Category[];

  @template()
  #content = () => html`<aside>${this.data?.map(({ name }) => name)}</aside><gemkit-outlet></gemkit-outlet>`;
}
```

## Server data

Server-only code goes into a sibling `*.server.ts` of the page or layout (e.g. `_layout.server.ts`),
it is never bundled into the client,
importing it from client code fails the build:

```ts
// src/pages/blog/[slug].server.ts
import { readFile } from 'node:fs/promises';
import type { ServerLoadContext } from '@mantou/gemkit';

// the result must be JSON, it is passed to the page as `data`
export async function load({ params, url }: ServerLoadContext<{ slug: string }>) {
  return { markdown: await readFile(`content/${params.slug}.md`, 'utf8') };
}

// params of the dynamic route to prerender, called for each language (`lang` is `''` without locales)
export const paths = async ({ lang }: { lang: string }) => [{ slug: 'hello' }];
```

- SSR: the data is embedded in the HTML, hydration uses it without another request
- Client-side navigation: fetch `<page path>/__data.json`, it contains the data of the page and its layouts
- Prerender: `__data.json` is written next to the page, so navigation works on a static host
- `gemkit start` serves the prerendered page and `__data.json` only when the URL has no query, other requests are
  rendered by the server. A static host ignores the query, pages whose `load` reads `url.searchParams` need a server
- The `load` option of the page or layout, if present, receives the server data as `data`

## API routes

A `*.server.ts` in `src/pages` without a page module of the same name is an API route, it exports handlers
named by the request methods (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`):

```ts
// src/pages/api/likes/[slug].server.ts -> /api/likes/:slug
import type { ServerLoadContext } from '@mantou/gemkit';

type Context = ServerLoadContext<{ slug: string }>;

// other values than `Response` are responded as JSON
export const GET = ({ params }: Context) => ({ likes: getLikes(params.slug) });

export async function POST({ params, request }: Context) {
  const { count } = await request.json();
  return Response.json({ likes: addLikes(params.slug, count) }, { status: 201 });
}
```

- `rss.xml.server.ts` is `/rss.xml`, `index.server.ts` is the directory path
- the path has no language prefix, `handle` runs before the handler, `event.path` is the API path
- the context is the same as `load`: `params`, `url`, `request`, `cookies` and `locals`,
  cookies set in the handler are added to the response
- `redirect` responds with the redirect, `error(status, message)` responds with `{ status, message }` as JSON,
  `HEAD` uses `GET`, methods not exported respond 405
- cross-site requests with a form content type (`application/x-www-form-urlencoded`, `multipart/form-data`,
  `text/plain`) are rejected (CSRF), other cross-site requests need a CORS preflight, requests without
  `Origin` (e.g. webhooks) are not affected
- API routes are not prerendered, they are not available on a static host

## Request, cookies and redirect

`load` also receives the current `request` and its `cookies`, `redirect` responds with a redirect:

```ts
// src/pages/_layout.server.ts
import type { ServerLoadContext } from '@mantou/gemkit';

// pages reading the request can't be prerendered, in a layout it applies to all its pages
export const prerender = false;

export const load = ({ cookies }: ServerLoadContext) => ({ user: cookies.get('user') ?? null });
```

```ts
// src/pages/editor.server.ts
import { redirect, type ServerLoadContext } from '@mantou/gemkit';

export const prerender = false;

export function load({ cookies }: ServerLoadContext) {
  if (!cookies.get('token')) redirect(302, '/login');
}
```

- `cookies.set` / `cookies.delete` add `Set-Cookie` to the response, defaults: `Path=/; HttpOnly; SameSite=Lax`,
  `Secure` on HTTPS. Headers are sent with the document, cookies set after it (e.g. in `@server` methods) are ignored
- Responses that read `request` or `cookies`, or set cookies, have `Cache-Control: private, no-store`,
  so a CDN doesn't share them between users
- `redirect(status, location)` throws, `location` is the full path (including the language prefix);
  SSR responds with the status and `Location`, client navigation (`__data.json`) navigates to it instead.
  Prerendered redirects are written as `<meta http-equiv="refresh">` pages and `__data.json` contains the location,
  so they work on a static host
- `request` and `cookies` throw when prerendering, export `prerender = false` from the page or layout `*.server.ts`

## Request hook

`handle` in `src/app.server.ts` runs before every server request: page, `__data.json`, form actions, server elements
and API routes.
Check the auth for a group of paths in one place,
and share data (e.g. the current user) with `load`, `actions` and server elements through `locals`:

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

- Check the auth here instead of in a layout `load`: a layout `load` doesn't run for form actions and server elements,
  and in `__data.json` the page `load` runs in parallel with it, even when the layout redirects
- `path` is the page path without the language prefix, matched by the routes, check it instead of `url.pathname`
- `url` is the page URL (including the language prefix), for `__data.json` and server elements too
- `redirect` responds like in `load`, server elements are not rendered and the client navigates to the location
- `handle` also runs before prerendering, paths where it reads `request`/`cookies` or redirects are not prerendered,
  so only read them for the paths that need them, prerendered pages are public
- `getRequestEvent()` returns the same `{ url, path, request, cookies, locals }` of the current request,
  e.g. in server elements, it throws outside a server request
- client navigation to a page without `*.server.ts` sends no request, `handle` doesn't run

### Server elements

The page URL of a server element request is sent by the client, and any server element can be requested with any URL,
attributes and properties. Path checks in `handle` don't protect server elements,
check the permission in the element with `getRequestEvent().locals`:

```ts
@customElement('app-admin-stats')
@server()
class AdminStatsElement extends GemElement {
  @template()
  #content = () => (getRequestEvent().locals.user?.admin ? html`...` : html``);
}
```

## Form actions

Pages handle form submissions with `actions` in `*.server.ts`, posted to `<page path>?/<name>`:

```ts
// src/pages/login.server.ts
import { redirect, type ServerLoadContext } from '@mantou/gemkit';

export const actions = {
  login: async ({ request, cookies }: ServerLoadContext) => {
    const form = await request.formData();
    const res = await fetch(`${API}/users/login`, { method: 'POST', body: JSON.stringify({ ... }) });
    // the result must be JSON, returned to `submitAction`
    if (!res.ok) return { errors: (await res.json()).errors };
    cookies.set('token', (await res.json()).user.token);
    redirect(303, '/');
  },
};
```

```ts
// src/pages/login.ts
import { page, submitAction } from '@mantou/gemkit';

@page('Sign in')
export default class LoginPage extends GemElement {
  #state = createState({ errors: undefined as Errors | undefined });

  #submit = async (evt: SubmitEvent) => {
    evt.preventDefault();
    this.#state({ errors: await submitAction(evt.target as HTMLFormElement, evt.submitter) });
  };

  @template()
  #content = () => html`<form method="post" action="?/login" @submit=${this.#submit}>...</form>`;
}
```

- `submitAction` submits without reloading: on redirect it navigates on the client, otherwise reloads the current
  page data, layouts reload their data too (e.g. the current user), returns the action result
- Without JS the form still works: the response is a 303 to the redirect location, or back to the page
  (the action result is dropped)
- Cookies use `SameSite=Lax` by default, cross-site form posts don't carry them

Generated modules are imported with `$gemkit/*`, e.g. `import { i18n, localizePath } from '$gemkit/i18n'`,
extend `.gemkit/tsconfig.json` in the project `tsconfig.json` to get the types.
