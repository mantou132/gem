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
- `gemkit start`: serve `dist`, prerendered pages first, otherwise SSR

SSR responses are streamed: the document is sent once the page `load` and `title` are resolved,
async content inside the page (e.g. `@server` methods) is streamed after it.

The generated `.gemkit` ignores itself, no `.gitignore` entry is needed.

## Project structure

```
src/
  app.ts               optional, imported before pages (global styles, stores)
  index.html           optional HTML template, use `<!--gemkit-body-->` as the content placeholder
  pages/
    _layout.ts         root layout, render `<gemkit-outlet>` for child routes
    _404.ts
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

Pages and layouts default export a Gem element, the tag name is generated from the file path:

```ts
import { GemElement, html, property, template } from '@mantou/gem';
import { page } from '@mantou/gemkit';

@page<{ slug: string }, Post | undefined>({
  // runs on the server and on client-side navigation, use isomorphic APIs,
  // the SSR result is sent to the client for hydration, so it must be a JSON value,
  // put server-only code in `*.server.ts`
  load: ({ slug }) => getPost(slug),
  title: (_, post) => post?.title || 'Not Found',
  // params of the dynamic route to prerender
  paths: () => posts.map(({ slug }) => ({ slug })),
})
export default class PostPage extends GemElement {
  @property data?: Post;

  @template()
  #content = () => html`<h1>${this.data?.title}</h1>`;
}
```

## Store

Module level stores updated on the server (e.g. in `@server` methods) are sent to the client automatically,
hydration uses the server values. Only JSON values are supported.

## Server elements

`@server()` element classes are only rendered on the server, their code and dependencies are not bundled into the
client, `@server({ lazy: true })` elements are loaded on the first interaction, see
[gem-ssr](https://github.com/mantou132/gem/tree/main/packages/gem-ssr#server-elements).

On client navigation, the HTML of the server elements in the page is fetched from `<page path>/__elements.json`
(written next to the page when prerendering), elements not in it (e.g. pages not prerendered, elements shown after
interaction) are rendered by the server on demand in one batched request, which is not available on a static host.

## Prefetch

When a `<gem-link>` is hovered or focused, the modules of the target page and its layouts, the server data
(`__data.json`, only when needed) and the server elements (`__elements.json`) are prefetched, the prefetched results
are used once within 30 seconds. On navigation, they are requested in parallel.

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

// params of the dynamic route to prerender
export const paths = async () => [{ slug: 'hello' }];
```

- SSR: the data is embedded in the HTML, hydration uses it without another request
- Client-side navigation: fetch `<page path>/__data.json`, it contains the data of the page and its layouts
- Prerender: `__data.json` is written next to the page, so navigation works on a static host
- The `load` option of the page or layout, if present, receives the server data as the second argument

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
- `redirect(status, location)` throws, `location` is the full path (including the language prefix);
  SSR responds with the status and `Location`, client navigation (`__data.json`) navigates to it instead
- `request` and `cookies` throw when prerendering, export `prerender = false` from the page or layout `*.server.ts`

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
