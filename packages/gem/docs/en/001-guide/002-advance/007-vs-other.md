# Is Gem a good fit?

Gem is a library for building applications and reusable elements on the Web Components platform. It uses standard HTML, CSS, JavaScript, and the browser's custom element model.

## From a small element to a complete app

Gem is layered, so you can use only the capabilities a project needs:

- **Lightweight custom element wrappers**: combine `@mantou/gem/lib/reactive` with `@mantou/gem/lib/decorators` without the lit-html template engine. For simple elements, update the DOM directly and keep the bundle smaller.
- **Reusable components and UI libraries**: use `@mantou/gem/lib/element` for `GemElement` and its template engine. These remain standard custom elements; [gem-port](https://github.com/mantou132/gem/tree/main/packages/gem-port) can generate React, Vue, and Svelte wrapper components.
- **Complete apps**: `@mantou/gem` adds app capabilities such as routing, history, and Store. Add [gemkit](https://github.com/mantou132/gem/tree/main/packages/gemkit) when you need an app framework with file-based routing, layouts, page data, and prerendering; [gem-ssr](https://github.com/mantou132/gem/tree/main/packages/gem-ssr) provides the SSR primitives.

## Choose a DOM mode for the use case

For reusable components in a UI library, prefer Shadow DOM to encapsulate implementation styles. For apps, prefer Light DOM so application-wide CSS and utilities such as Tailwind CSS work naturally across the page. Gem defaults to Light DOM; use `@shadow()` when a component should use Shadow DOM.

## Gem is a good fit when

- You want to build reusable custom elements that can be used in plain HTML and across framework ecosystems.
- You want to build a web app from custom elements, with reactive state, routing, and theming in the Gem ecosystem.
- You prefer HTML templates and standard JavaScript over JSX or template syntaxes such as Vue's and Svelte's.

## Things to consider

- Gem uses lit-html tagged template strings rather than JSX or template syntaxes such as Vue's and Svelte's. The syntax may feel unfamiliar if your team is used to those DSLs.
- The Gem core does not include ready-made UI components; use [DuoyunUI](https://github.com/mantou132/gem/tree/main/packages/duoyun-ui) or build your own.
- JavaScript users do not need a dedicated compiler for the core runtime. TypeScript checks, template diagnostics, and HMR use the corresponding TypeScript, editor, and build plugins; see [Development](./008-development.md).

## Compare specific workflows

- [Gem and Lit](../../004-blog/009-gem-vs-lit.md) compares their element models, styling, templates, and migration considerations.
- [Migrating from React](../../004-blog/008-migrate-from-react.md) walks through adapting a React app to Gem.
- For shared styles and Tailwind CSS setup, see [Styling elements](../001-basic/006-styled-element.md).
