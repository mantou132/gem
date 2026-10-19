---
isNav: true
---

# Plugins

## `<gbp-code-group>`

Used to display several pieces of code with similar functionality:

<gbp-code-group>

```bash npm
npm i gem-book
```

```bash pnpm
pnpm add gem-book
```

```bash yarn
yarn add gem-book
```

</gbp-code-group>

````md
<gbp-code-group>

```bash npm
npm i gem-book
```

```bash pnpm
pnpm add gem-book
```

```bash yarn
yarn add gem-book
```

</gbp-code-group>
````

## `<gbp-raw>`

Displays the content of a file as a code block when building, `src` is a path relative to the current document (starting with `.`) or to the current working directory, or a URL, prefixes can be mapped with [`importMap`](./002-cli.md#importmap), for example:

<gbp-raw src="package.json" range="2-3,-4--6,author-license" highlight="-5,author"></gbp-raw>

```md
<!-- `range` specifies the display range, supporting negative numbers and string matching, line numbers are displayed, `highlight` format is the same -->

<gbp-raw src="package.json" range="2-3,-4--6,author-license" highlight="-5,author"></gbp-raw>
```

Use `codelang` to specify the language when it is not the file extension.

## `<gbp-var>`

Reference global variable: <gbp-var>hello</gbp-var>

```md
<gbp-var>hello</gbp-var>
```

The variable needs to be defined in [`global`](./002-cli.md#global) of the config file.

## `<gbp-media>`

Displays images, videos or audios, `src` is the same as `<gbp-raw>`, files in the documents directory are output with the website, other files use the address in the repository:

```md
<gbp-media src="preview.png" width="400"></gbp-media>
```

## `<gbp-include>`

Dynamically loads Markdown snippets:

<gbp-include src="./guide/007-extension.md" range="[!NOTE]->"></gbp-include>

```md
<!-- `range` syntax is the same as `<gbp-raw>`, here `range` uses string matching -->

<gbp-include src="./guide/007-extension.md" range="[!NOTE]->"></gbp-include>
```

## `<gbp-import>`

Imports modules on the client when the page is displayed, `src` is the same as `<gbp-raw>`. Local files are bundled with the website and share its `@mantou/gem`, other packages imported by them are loaded from [esm.sh](https://esm.sh/), versions are specified in `dependencies`, so they don't need to be installed. URLs are loaded directly, `.ts` files are compiled with esm.sh:

<gbp-import height="20" name="my-plugin-hello" dependencies="canvas-confetti" src="docs/hello.ts"></gbp-import>

```md
<gbp-import height="20" name="my-plugin-hello" dependencies="canvas-confetti" src="docs/hello.ts"></gbp-import>
```

Specify name will auto-inserted as tag name after `<gbp-import>`, useful for custom elements.

## `<gbp-content>`

Inserts content into the [regions of the page](./guide/007-extension.md#slots) or `<head>` (without `slot`), allowing customization of specific pages:

```md
<gbp-content slot="sidebar-before">
  <div>Test</div>
</gbp-content>
```

## `<gbp-docsearch>`

Use [Algolia DocSearch](https://docsearch.algolia.com/) to provide search for the website, it is displayed in the navigation bar, configured with [`docsearch`](./002-cli.md#docsearch):

```json
{
  "docsearch": {
    "appId": "xxx",
    "apiKey": "xxx",
    "indexName": "xxx"
  }
}
```

Use `"docsearch": "local"` to provide local search service (thanks to [MiniSearch](https://github.com/lucaong/minisearch/)), the index is generated when building, [example](https://duoyun-ui.gemjs.org).

## `<gbp-comment>`

It uses [Gitalk](https://github.com/gitalk/gitalk) to bring comment functionality to the pages, it is displayed after documents, configured with [`comment`](./002-cli.md#comment):

```json
{
  "comment": {
    "clientID": "xxx",
    "clientSecret": "xxx"
  }
}
```

The repository is the [`github`](./002-cli.md#github) by default, use `owner` and `repo` to specify it.

## `<gbp-sandpack>`

Use [Sandpack](https://sandpack.codesandbox.io/) to create interactive examples:

<gbp-sandpack dependencies="@mantou/gem, duoyun-ui">

```ts
import { render, html } from '@mantou/gem';

import 'duoyun-ui/elements/button';

render(
  html`<dy-button>Time: ${new Date().toLocaleString()}</dy-button>`,
  document.getElementById('root'),
);
```

</gbp-sandpack>

````md
<gbp-sandpack dependencies="@mantou/gem, duoyun-ui">

```ts
import { render, html } from '@mantou/gem';

import 'duoyun-ui/elements/button';

render(
  html`<dy-button>Time: ${new Date().toLocaleString()}</dy-button>`,
  document.getElementById('root'),
);
```

</gbp-sandpack>
````

## `<gbp-example>`

Generate examples for any custom element, for example:

<gbp-example name="dy-avatar"  src="https://esm.sh/duoyun-ui/elements/avatar">

```json
{
  "src": "https://api.dicebear.com/5.x/bottts-neutral/svg",
  "status": "positive",
  "size": "large",
  "square": true
}
```

</gbp-example>

````md
<gbp-example name="dy-avatar"  src="https://esm.sh/duoyun-ui/elements/avatar">

```json
{
  "src": "https://api.dicebear.com/5.x/bottts-neutral/svg",
  "status": "positive",
  "size": "large",
  "square": true
}
```

</gbp-example>
````

Array can be used in code blocks to display multiple differently configured elements.

## `<gbp-api>`

Use [`gem-analyzer`](https://github.com/mantou132/gem/tree/main/packages/gem-analyzer) to generate API documentation for `GemElement` when building, the headings are in the table of contents, such as [`<gem-book-code>` API](./004-api.md#gem-book-code):

```md
<!-- `name` specifies the element, without it, all elements in the file are displayed, the exports are displayed if there are no elements -->

<gbp-api name="gem-book-code" src="app/elements/code.ts"></gbp-api>
```

The API of the parent class imported from a package needs [`importMap`](./002-cli.md#importmap) to find the source.
