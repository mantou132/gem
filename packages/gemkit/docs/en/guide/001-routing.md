# Routing

Routes are derived from the file system. A file in `src/pages` is a page, a directory adds a URL segment,
and a few special names define layouts, dynamic segments and error pages.

## File names

| File                                   | URL                |
| -------------------------------------- | ------------------ |
| `src/pages/index.ts`                   | `/`                |
| `src/pages/about.ts`                   | `/about`           |
| `src/pages/blog/index.ts`              | `/blog`            |
| `src/pages/blog/[slug].ts`             | `/blog/:slug`      |
| `src/pages/blog/[...rest].ts`          | `/blog/*`          |
| `src/pages/api/likes/[slug].server.ts` | `/api/likes/:slug` |
- `index` maps to the directory path: `blog/index.ts` is `/blog`, not `/blog/index`.
- `[name]` matches one segment and exposes it as `params.name`.
- `[...rest]` matches the rest of the path, including its remaining segments. The value is a numbered
  parameter, `params[0]` for the first catch-all in the pattern.
- Page modules can be `.js`, `.mjs`, `.cjs`, `.ts`, `.mts` or `.cts`.
- Files and directories whose name starts with `_` or `.` are not pages. They are used for special files
  such as `_layout.ts` and `_error.ts`, or for modules that are imported by pages. Test files
  (`*.test.*`, `*.spec.*`) and declaration files are ignored too.
- The server accepts both `/about` and `/about/`. Client navigation removes the trailing slash from the
  URL without rendering again.

Dynamic segments and catch-all routes are only prerendered when their paths are known. See
[dynamic paths](./002-pages.md#dynamic-paths).

## Layouts

A directory can contain `_layout.ts`. The default export is a Gem element marked with `@layout`, and it renders
`<gemkit-outlet>` where its child routes appear:

```ts
// src/pages/blog/_layout.ts
import { GemElement, html, template } from '@mantou/gem';
import { layout } from '@mantou/gemkit';

@layout()
export default class BlogLayout extends GemElement {
  @template()
  #content = () =>
    html`
      <aside>Blog</aside>
      <section><gemkit-outlet></gemkit-outlet></section>
    `;
}
```

Layouts can be nested. `src/pages/_layout.ts` is the root layout; `src/pages/blog/_layout.ts` wraps
everything under `/blog`. A layout is not a route by itself and has no URL.

When navigating between pages that share a layout, the layout element is kept. Only the child outlet changes,
so scroll position, open menus and other state in the layout survive. See [Layouts](./003-layouts.md).

## Error page

`src/pages/_error.ts` is the error page and the 404 page of unmatched paths:

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

It has no URL pattern and no server module. It is rendered in place of the failed page or layout,
and the request keeps the original URL:
- errors thrown by `load` or `actions` render it at the position of the route that failed, outer layouts stay
- unmatched paths render it as a 404 page
- unexpected errors use the status `500`; in production the message is `Internal Error`

See [Errors and redirects](./007-request.md#errors-and-redirects) for `error()`, `notFound()` and `handleError`.

## Route priority

When several routes match a path, the more specific one wins. In each layout, routes are sorted by segment:
1. static segments
2. dynamic segments (`:name`)
3. missing segments, so `/` is before `/*`
4. catch-all segments (`*`)

For example `/blog/new` wins over `/blog/[slug]`, and `/blog` wins over `/blog/[...rest]`.

## Page modules and server modules

A page module and its `*.server.ts` sibling are a pair. They have the same base name and route:

```
src/pages/blog/[slug].ts
src/pages/blog/[slug].server.ts
```

The server module is only loaded on the server. Importing it from client code fails the build.

A `*.server.ts` without a page module is an [API route](./006-api-routes.md) instead.

## App files

Besides `pages` and `locales`, these optional files configure the app:

| File                | Purpose                                                            |
| ------------------- | ------------------------------------------------------------------ |
| `src/app.ts`        | Imported before routes, for global styles, stores and other setup. |
| `src/app.server.ts` | `handle` and `handleError` for server requests.                    |
| `src/index.html`    | Replaces the default HTML template, keep `<!--gemkit-body-->`.     |
| `src/elements/*.ts` | Elements imported automatically from `app-*` tags (see below).     |

Elements in `src/elements` can be used in templates without importing them. `src/elements/counter.ts`
is the element `app-counter`; change the prefix with the
[`elementPrefix`](../reference/001-config.md#elementprefix) plugin option. This is implemented by
[unplugin-gem](https://github.com/mantou132/gem/tree/main/packages/unplugin-gem).

## Languages

Language prefixes are not part of the page tree. With locales in `src/locales`, every path above is also
available under `/{lang}`, for example `/zh/about`. The default language has no prefix by default.
See [Internationalization](./009-i18n.md).
