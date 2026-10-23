# Configuration

Gemkit is an Rsbuild plugin. Add it to `rsbuild.config.ts`:

```ts
import { defineConfig } from '@rsbuild/core';
import { pluginGemkit } from '@mantou/gemkit/plugin';

export default defineConfig({
  plugins: [
    pluginGemkit({
      title: 'My Site',
      titleTemplate: '%s | My Site',
    }),
  ],
});
```

## Plugin options

### `title`

- Type: `string`
- Default: `''`

The site title. It is used for pages without a `title` option.

### `titleTemplate`

- Type: `string`
- Default: `'%s'`

The title template. The first `%s` is replaced with the page title. A page title is ignored when the
template has no `%s`.

### `srcDir`

- Type: `string`
- Default: `'src'`

The directory that contains `pages`, `locales`, `elements`, `app.ts`, `app.server.ts` and `index.html`.
It is resolved from the project root and can point to another package that provides the pages.
`.gemkit` and `dist` are still generated in the project root.

### `defaultLanguage`

- Type: `string`
- Default: `'en'` when `en.json` exists, otherwise the first language file by name

The default language. It has no URL prefix unless `prefixDefaultLanguage` is enabled. It must have a
language file.

### `prefixDefaultLanguage`

- Type: `boolean`
- Default: `false`

Put the default language under a prefix too, for example `/en/about`. Unprefixed paths redirect to the
default language, including on a static host.

### `prerender`

- Type: `boolean`
- Default: `true`

Prerender static routes and the dynamic routes returned by `paths` at build time. When `false`, every
page is rendered on demand and needs a server.

Individual pages and layouts can opt out in their server module with `export const prerender = false`,
or in a layout to disable it for all of its pages.

### `elementPrefix`

- Type: `string`
- Default: `'app'`

The tag prefix of elements in `<srcDir>/elements`. With the default, `<app-foo>` imports
`<srcDir>/elements/foo`.

### `gem`

- Type: `UnpluginGemOptions`
- Default: `undefined`

Options passed to [unplugin-gem](https://github.com/mantou132/gem/tree/main/packages/unplugin-gem).
Gemkit sets the include paths, `@mantou/gemkit` and `$gemkit/*` API auto-import, element auto-import,
style and HTML minification, selector compatibility, preload and SSR, and enables HMR in development.
Options here override those defaults; `hmr` can still be overridden separately.

## Generated files

Gemkit generates into `.gemkit`:

| File               | Description                                                                  |
| ------------------ | ---------------------------------------------------------------------------- |
| `index.ts`         | The client entry, generated from the pages and prerender state.              |
| `server.ts`        | The server entry, used by the SSR build and prerendering.                    |
| `routes.ts`        | The route table.                                                             |
| `i18n.ts`          | `$gemkit/i18n`, see [i18n](../guide/009-i18n.md).                            |
| `api.ts`           | `$gemkit/api`, see [API routes](../guide/006-api-routes.md).                 |
| `auto-import.d.ts` | Auto-import types for `@mantou/gemkit`, `$gemkit/*` and `<srcDir>/elements`. |
| `tsconfig.json`    | Path aliases and types, extend it from the project `tsconfig.json`.          |

`.gemkit` is ignored by Git. Extend its tsconfig to get types for `$gemkit/*` and auto-imports:

```json
{
  "extends": "./.gemkit/tsconfig.json"
}
```

The generated files are overwritten at every build. Don't import them directly, except `$gemkit/i18n`
and `$gemkit/api`.

## Build output

| Directory     | Content                                                                        |
| ------------- | ------------------------------------------------------------------------------ |
| `dist/web`    | Client assets, prerendered pages, `__data.json`, `__elements.json`, `404.html` |
| `dist/server` | SSR bundle and the HTML template.                                              |

The HTML template is moved out of `dist/web` after the client build, so a static host doesn't serve it as
the home page. See [Deploy](../guide/011-deploy.md).

## Environment

| Variable           | Description                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| `PORT`             | The port of `gemkit start`, default `3000`.                                                         |
| `ORIGIN`           | The public origin of `gemkit start`, for `url`, `Secure` cookies and same-origin checks.            |
| `GEMKIT_PRERENDER` | Set by the build. `'false'` means pages are not prerendered and the client skips `__elements.json`. |

## Renderer

`@mantou/gemkit/server` exports `createRenderer(options)`. It creates the renderer used by the build and
by `gemkit start`, with the app, server modules, endpoints, i18n and title options. It is an advanced API
for integrations that provide their own server; normal applications use `gemkit start`.
