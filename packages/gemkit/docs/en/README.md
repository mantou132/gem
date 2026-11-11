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
    icon: 📁
    desc: A file in `src/pages` is a route, with nested layouts, dynamic segments and pages loaded on demand
  - title: SSR and SSG
    icon: ⚡
    desc: Pages render on the server and hydrate in the browser; pages that don't depend on the request are prerendered for static hosting
  - title: Server elements
    icon: 🏝️
    desc: '`@server()` keeps code out of the client bundle and `@lazy()` loads it on interaction'
  - title: Request-aware
    icon: 🔐
    desc: Read cookies in `load`, handle forms with `actions`, guard paths with a request hook and write API routes as plain modules
  - title: Internationalization
    icon: 🌐
    desc: Language packs in `src/locales` give you prefixed URLs, translated pages and language detection
  - title: Rsbuild native
    icon: 🦀
    desc: Gemkit is an Rsbuild plugin, so its dev server, configuration and plugins all work as usual
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

## Benchmark

The same [RealWorld](https://github.com/gothinkster/realworld) app (same API, same CSS) built with Gemkit,
SvelteKit, Nuxt and Next.js. Gemkit passes 84 of 91 official e2e tests;
the source, test failures and methodology are in the [realworld repo](https://github.com/mantou132/realworld/tree/framework-comparison/frameworks).

![Client JavaScript](https://raw.githubusercontent.com/mantou132/realworld/framework-comparison/frameworks/bench/results/charts/1-js.png)
![SSR throughput](https://raw.githubusercontent.com/mantou132/realworld/framework-comparison/frameworks/bench/results/charts/2-ssr.png)
![Lighthouse](https://raw.githubusercontent.com/mantou132/realworld/framework-comparison/frameworks/bench/results/charts/3-lighthouse.png)
![Client navigation and code size](https://raw.githubusercontent.com/mantou132/realworld/framework-comparison/frameworks/bench/results/charts/4-dx.png)

## Packages

Gemkit is built on [Gem](https://gemjs.org) and
[gem-ssr](https://github.com/mantou132/gem/tree/main/packages/gem-ssr), and is used by
[GemBook](https://book.gemjs.org) to build documentation websites.
