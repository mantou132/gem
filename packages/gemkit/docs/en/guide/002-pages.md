# Pages

A page is a module in `src/pages` whose default export is a Gem element marked with `@page`.
Gemkit generates the tag name, loads the module on demand and passes `params` and `data` to the element.

```ts
// src/pages/about.ts
import { GemElement, html, template } from '@mantou/gem';
import { page } from '@mantou/gemkit';

@page('About')
export default class AboutPage extends GemElement {
  @template()
  #content = () => html`<h1>About</h1>`;
}
```

`@page` accepts a title string or an options object.

## Options

| Option  | Type                             | Description                                    |
| ------- | -------------------------------- | ---------------------------------------------- |
| `title` | `string \| (ctx) => string`      | The page title, see [Title](#title).           |
| `load`  | `(ctx) => data \| Promise<data>` | Load data before rendering, see [Load](#load). |
| `meta`  | `Meta \| (ctx) => Meta`          | `<meta>` tags of the page, see [Meta](#meta).  |
| `paths` | `({ lang }) => Params[]`         | Parameters of the dynamic route to prerender.  |

The context of `title`, `load` and `meta` is `{ params, data }`. For `load`, `data` is the result of the
sibling `*.server.ts`; for `title` and `meta`, `data` is the result of `load`.

```ts
// src/pages/blog/[slug].ts
import { GemElement, html, property, template } from '@mantou/gem';
import { page } from '@mantou/gemkit';

interface Post {
  slug: string;
  title: string;
  summary?: string;
  cover?: string;
}

@page<{ slug: string }, Post | undefined>({
  load: ({ params }) => getPost(params.slug),
  title: ({ data }) => data?.title || 'Not Found',
  meta: ({ data }) => ({ description: data?.summary, 'og:image': data?.cover }),
  paths: () => posts.map(({ slug }) => ({ slug })),
})
export default class PostPage extends GemElement {
  @property data?: Post;

  @template()
  #content = () => html`<h1>${this.data?.title}</h1>`;
}
```

The first generic parameter is the route params, the second is the type of `data`. They are only for typing;
Gemkit does not validate the data at runtime.

## Page element

The generated route passes the following properties to the page element:

| Property | Description                                                    |
| -------- | -------------------------------------------------------------- |
| `params` | The matched route parameters, for example `{ slug: 'hello' }`. |
| `data`   | The result of `load`, or of the sibling server module `load`.  |

Declare them with `@property` so the template re-renders when they change:

```ts
@page<{ slug: string }, Post | undefined>({ load: ({ params }) => getPost(params.slug) })
export default class PostPage extends GemElement {
  @property params!: { slug: string };
  @property data?: Post;
}
```

When the params change, for example when navigating from `/blog/a` to `/blog/b`, the page element is
recreated. Elements and state inside the page belong to the old page and are not reused. When only the
query changes or the data is reloaded after a form submission, the page element is reused and receives
the new `data`.

## Load

`load` runs on the server and on client-side navigation. It must use isomorphic APIs, such as `fetch` and
`import()`, because the same code runs in both environments. Its result is serialized to JSON and embedded
into the document, so it must be a JSON value, not a class instance or a function.

Server-only code belongs in the sibling `*.server.ts`, whose `load` result is passed to `load` as `data`:

```ts
// src/pages/blog/[slug].ts
@page<{ slug: string }, { markdown: string }>({
  load: ({ data }) => parseMarkdown(data.markdown),
});
```

```ts
// src/pages/blog/[slug].server.ts
import { readFile } from 'node:fs/promises';

export async function load({ params }: { params: { slug: string } }) {
  return { markdown: await readFile(`content/${params.slug}.md`, 'utf8') };
}
```

If `load` is not provided, the result of the server module `load` is used directly as `data`.
- On the first request the data is embedded into the HTML, so hydration does not fetch it again.
- On client navigation Gemkit fetches `<page path>/__data.json`.
- When prerendering, the data file is written next to the page.
- If `load` redirects or throws `error()`, the page is not rendered; see [Request](./007-request.md).

## Title

The page title is set after the page `load` finishes, and the `<title>` is updated on client navigation.
Use a string for a fixed title, or a function to build it from `params` and `data`:

```ts
@page({ title: ({ data }) => data?.title || 'Untitled' })
```

The site title and title template come from the plugin options:

```ts
pluginGemkit({ title: 'My Site', titleTemplate: '%s | My Site' });
```

`%s` is replaced by the page title. If the page has no title, the site title is used. A page without a
`title` option does not change the title on client navigation.

## Meta

`meta` returns an object whose values are strings or `undefined`. Keys containing `:` (for example
`og:image`) are rendered as `<meta property>`, others as `<meta name>`. `undefined` values are skipped.

```ts
@page({
  meta: ({ data }) => ({
    description: data?.summary,
    'og:image': data?.cover,
  }),
})
```

Metas of layouts and the page are merged, and inner routes override the same key. The root layout is a good
place for site-wide defaults.

On the server the page metas are appended to `<head>`. On client navigation Gemkit removes the previous
page metas and adds the new ones. Don't repeat the same `<meta>` in `src/index.html`: the page one is added,
not replacing it.

## Dynamic paths

A dynamic route has no fixed URL list. To prerender it, return the params of every page from `paths`,
either in the page options or in the server module:

```ts
@page<{ slug: string }>({
  paths: () => posts.map(({ slug }) => ({ slug })),
});
```

```ts
// src/pages/blog/[slug].server.ts
export function paths() {
  return [{ slug: 'hello' }, { slug: 'world' }];
}
```

`paths` is called for each language with `{ lang }`, so different languages can have different pages.
The page `paths` option is enough for routes without a server module. The server module `paths` is useful
when the list comes from the file system or a database.

Static routes are always prerendered. A dynamic route without `paths` is rendered on demand and needs a
server at runtime, or you can set [`prerender: false`](../reference/001-config.md#prerender) to disable
prerendering for the whole site.
