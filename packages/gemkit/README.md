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

Generated modules are imported with `$gemkit/*`, e.g. `import { i18n, localizePath } from '$gemkit/i18n'`,
extend `.gemkit/tsconfig.json` in the project `tsconfig.json` to get the types.
