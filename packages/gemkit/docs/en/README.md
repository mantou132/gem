---
hero:
  title: Gemkit
  desc: A Gem application framework built on Rsbuild — file-based routing, layouts, i18n, SSR and SSG.
  actions:
    - text: Get started
      link: ./guide/README.md
    - text: GitHub
      link: https://github.com/mantou132/gem/tree/main/packages/gemkit
features:
  - title: File-based routing
    desc: >
      Create a file in `src/pages` and it becomes a route. Nested directories, dynamic segments,
      catch-all routes, layouts and error pages are all part of the file system.


      Route modules are loaded on demand, so pages that are not visited are not downloaded.
  - title: SSR and SSG
    desc: >
      Every page is rendered on the server, then hydrated in the browser. Pages that don't depend on the
      request are prerendered at build time, so they work on any static host.


      Server data is embedded into the document, so hydration does not make another request.
  - title: Server elements
    desc: >
      Mark elements with `@server()` to keep their code and dependencies out of the client bundle,
      or `@lazy()` to load them when the user interacts with them.


      A page can mix static HTML, interactive islands and fully server-rendered parts.
  - title: Request-aware
    desc: >
      Read cookies and the request in `load`, redirect in one line, handle form submissions with
      `actions`, and protect a group of paths in one place with a request hook.


      API routes are plain modules exporting `GET`, `POST`, and other HTTP methods.
  - title: Internationalization
    desc: >
      Put language packs in `src/locales`, get language-prefixed URLs, translated pages and
      server-side language detection without routing boilerplate.
  - title: Rsbuild native
    desc: >
      Gemkit is an Rsbuild plugin. Configure Rsbuild as usual and use any Rsbuild feature,
      including its dev server, environment configuration and build plugins.
---

## Start with a file

```ts
// src/pages/index.ts
@page('Home')
export default class HomePage extends GemElement {
  @template()
  #content = () => html`<h1>Hello Gemkit</h1>`;
}
```

That is a complete page. Gemkit generates the route, the client entry and the server entry.
The same page is prerendered to `dist/web/index.html` and hydrated on the client.

```sh
npm create gemkit@latest my-app
cd my-app
pnpm dev
```

Continue with the [guide](./guide/README.md) to learn about data loading, layouts, forms,
server elements and deployment.

## Packages

Gemkit is built on [Gem](https://gemjs.org) and
[gem-ssr](https://github.com/mantou132/gem/tree/main/packages/gem-ssr), and is used by
[GemBook](https://book.gemjs.org) to build documentation websites.
