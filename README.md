# Gem

Read in other languages: English | [中文](./README_zh.md)

Build reusable custom elements and web apps on Web Components with Gem's layered toolset.

## Features

- **Start with a small custom element:**
  Use Gem's reactive and decorator APIs without a template engine, then add `GemElement` and HTML template rendering when you need them.

- **Build UI libraries:**
  Gem elements are standard custom elements. Prefer Shadow DOM when components need style isolation, and use [gem-port](packages/gem-port) to generate React, Vue, and Svelte wrappers for those ecosystems.

- **Build complete apps:**
  Use `@mantou/gem` for routing, history, and Store; [gemkit](packages/gemkit) adds file-based routing, layouts, SSR, and SSG. Prefer Light DOM for app UI that should work naturally with Tailwind CSS and other global CSS.

- **Use familiar web standards:**
  Build with HTML templates, CSS, and JavaScript on the browser's custom element model, with no JSX or single-file component DSL to learn.

- **Asynchronous rendering:**
  `@async()` lets many elements render in slices, yielding to the main thread to keep the interface responsive.

## Documentation

- [Guide](https://gemjs.org/guide/)
- [API](https://gemjs.org/api/)

## Project Packages

| Package                                         | Description                                                                                          |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| [gem](packages/gem)                             | Gem core                                                                                             |
| [gem-ssr](packages/gem-ssr)                     | Server-side rendering and hydration for Gem elements                                                 |
| [gemkit](packages/gemkit)                       | Application framework with file-based routing, layouts, SSR, and SSG                                 |
| [gem-devtools](packages/gem-devtools)           | Browser debugging tool for Gem                                                                       |
| [gem-analyzer](packages/gem-analyzer)           | Gem element analyzer, which can automatically generate documents                                     |
| [gem-book](packages/gem-book)                   | Documentation site builder created using Gem                                                         |
| [duoyun-ui](packages/duoyun-ui)                 | Desktop UI library created using Gem                                                                 |
| [tap-ui](packages/tap-ui)                       | Mobile-first UI library created using Gem                                                            |
| [gem-port](packages/gem-port)                   | Export Gem elements as React/Vue/Svelte components                                                   |
| [gem-examples](packages/gem-examples)           | Gem and DuoyunUI examples                                                                            |
| [ts-gem-plugin](packages/ts-gem-plugin)         | Gem language service plugin for TypeScript                                                           |
| [ts-gem-lsp](packages/ts-gem-lsp)               | Gem language server for TypeScript 7                                                                 |
| [swc-plugin-gem](crates/swc-plugin-gem)         | Build plugin for [SWC](https://swc.rs/)                                                              |
| [unplugin-gem](packages/unplugin-gem)           | Universal plugin for Vite/Webpack/Rollup/esbuild/Rspack/Rolldown                                     |
| [zed-plugin-gem](crates/zed-plugin-gem)         | [Zed](https://zed.dev/) extension                                                                    |
| [vscode-gem-plugin](packages/vscode-gem-plugin) | VSCode [extension](https://marketplace.visualstudio.com/items?itemName=gem-vscode.vscode-plugin-gem) |

[Roadmap](https://mm.tt/app/map/3412316197?t=TGs84FRcwQ).

## Contribution

Fork the repository and open a pull request.
