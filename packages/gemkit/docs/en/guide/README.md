# Introduction

Gemkit is an application framework for [Gem](https://gemjs.org) built on [Rsbuild](https://rsbuild.rs).
It turns the files in `src/pages` into routes, renders every page on the server, and hydrates it in the browser.
Pages that don't depend on the request are prerendered at build time (SSG), so the same app can be deployed
to a static host or to a Node.js server.

It is implemented as an Rsbuild plugin, so the Rsbuild configuration, dev server, build pipeline and plugins
are all still available.

## Create an app

```sh
npm create gemkit@latest my-app
# or
npx @mantou/gemkit init my-app
```

The directory must be empty or not exist. Then:

```sh
cd my-app
pnpm install
pnpm dev
```

## Commands

| Command         | Description                                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------------------------- |
| `rsbuild dev`   | Start the dev server with SSR and HMR. Pages are rendered on each request.                                  |
| `rsbuild build` | Build `dist/web` (client assets and prerendered pages) and `dist/server` (server bundle and HTML template). |
| `gemkit start`  | Serve `dist`. Prerendered pages are served first, other requests are rendered by the server.                |
| `gemkit init`   | Create an app from the starter template, in an empty or non-existing directory.                             |

`gemkit start` reads these environment variables:
- `PORT`: the HTTP port, default `3000`
- `ORIGIN`: the public origin, for example `https://example.com`. Set it behind a reverse proxy, otherwise the origin
  comes from the `Host` header and the connection protocol. It is used by `url` in `load`, `Secure` cookies, and the
  same-origin check.

See [Deploy](./011-deploy.md) for the build output and deployment options.

## Add to an existing Rsbuild project

```ts
// rsbuild.config.ts
import { pluginGemkit } from '@mantou/gemkit/plugin';
import { defineConfig } from '@rsbuild/core';

export default defineConfig({
  plugins: [pluginGemkit({ title: 'My Site', titleTemplate: '%s | My Site' })],
});
```

The plugin generates the route table, the client entry and the server entry in `.gemkit`, and builds two
environments: `web` and `node`. You can still add any other Rsbuild plugins and configuration.

## Project structure

```
src/
  app.ts               optional, imported before pages (global styles, stores)
  app.server.ts        optional, `handle` runs before every server request
  index.html           optional HTML template, use `<!--gemkit-body-->` as the content placeholder
  elements/            optional, `app-*` tags are imported automatically
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

Only the `pages` and `locales` directories are required. Layouts are optional; without `_layout.ts`, pages are
rendered directly in the root outlet.

## A page

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

The default export must be a Gem element. Its tag name is generated from the file path, so you don't need to
call `@customElement`. The file path also determines the URL.

## A layout

```ts
// src/pages/_layout.ts
import { GemElement, html, template } from '@mantou/gem';
import { layout } from '@mantou/gemkit';

@layout()
export default class RootLayout extends GemElement {
  @template()
  #content = () =>
    html`
      <header>My Site</header>
      <main><gemkit-outlet></gemkit-outlet></main>
    `;
}
```

`<gemkit-outlet>` renders the next matched layout or page. When navigating between pages under the same layout,
the layout is kept and its state is not recreated.

## What next

- [Routing](./001-routing.md): how files become URLs
- [Pages](./002-pages.md): `load`, `title`, `meta` and `paths`
- [Server data](./004-server-data.md): request-aware data and prerendering
- [Server elements](./008-server-elements.md): `@server()`, `@lazy()` and `@client()`
- [Rendering](./010-rendering.md): what happens on first load, hydration and navigation
- [Reference](../reference/001-config.md): all plugin options
