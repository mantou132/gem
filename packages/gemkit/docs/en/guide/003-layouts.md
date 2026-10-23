# Layouts

A layout wraps the pages in its directory and in nested directories. It is a Gem element marked with
`@layout`, and it renders `<gemkit-outlet>` where the child route appears.

```
src/pages/
  _layout.ts           root layout
  index.ts             /
  blog/
    _layout.ts         wraps /blog, /blog/hello, ...
    index.ts           /blog
    [slug].ts          /blog/:slug
```

## Define a layout

```ts
// src/pages/blog/_layout.ts
import { GemElement, html, property, template } from '@mantou/gem';
import { layout } from '@mantou/gemkit';

@layout()
export default class BlogLayout extends GemElement {
  @template()
  #content = () =>
    html`
      <aside>Categories</aside>
      <article><gemkit-outlet></gemkit-outlet></article>
    `;
}
```

The root layout is `src/pages/_layout.ts`. It wraps every page, including the error page. A layout has no
URL of its own; it is matched by the directory it is in.

Nested layouts are kept when navigating between pages under the same layout. The root layout stays for
the whole session unless the language changes, and a nested layout stays while its params don't change.
This is useful for sidebars, tabs and other UI that should not be recreated on every navigation.

## Layout data

A layout can load data like a page:

```ts
// src/pages/blog/_layout.ts
import { GemElement, html, property, template } from '@mantou/gem';
import { layout } from '@mantou/gemkit';

@layout({
  load: () => fetch('/api/categories').then((res) => res.json()),
})
export default class BlogLayout extends GemElement {
  @property data?: { name: string }[];

  @template()
  #content = () =>
    html`
      <aside>${this.data?.map(({ name }) => html`<a>${name}</a>`)}</aside>
      <article><gemkit-outlet></gemkit-outlet></article>
    `;
}
```

The context is the same as for pages, `{ params, data }`. `params` only contains the segments of the layout
directory, not the child route part. For example in `src/pages/users/[id]/_layout.ts`, `params` is
`{ id }` for any page under `/users/:id`.

The result is passed to the layout element as `data`. It can be a JSON value; the same rules as page
`load` apply.

When navigating between child routes, the layout data is reused as long as its params are unchanged.
After a form submission it is loaded again, because the request may have changed the state it depends
on, such as the current user.

A layout can also have a sibling `_layout.server.ts`, whose `load` result is passed to `load` as `data`.
The [request hook](../guide/007-request.md) should be used for authentication that must run for every
request, not a layout `load`: a layout `load` does not run for form actions and server elements, and on
client navigation it runs in parallel with the page `load`.

## Meta

Layouts support `meta`, merged with the page meta. Inner routes override the same key:

```ts
@layout({
  meta: { 'og:site_name': 'My Site' },
})
```

## Errors

When a page or layout `load` throws, the [error page](./001-routing.md#error-page) is rendered in place of
the failed route, and the outer layouts are kept. This means the navigation and footer of the layout are
still shown on a 404 page.

## Root layout and `<gemkit-outlet>`

The root layout is optional. Without it, pages are rendered directly in the root outlet. With it, the
layout's template is rendered first, and `<gemkit-outlet>` renders the matched child layout or page.

Only render `<gemkit-outlet>` once in a layout. It finds the routes of its owning layout by looking at its
parent element.
