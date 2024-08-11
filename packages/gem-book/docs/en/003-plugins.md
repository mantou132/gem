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

```bash yarn
yarn add gem-book
```

</gbp-code-group>

````md
<gbp-code-group>

```bash npm
npm i gem-book
```

```bash yarn
yarn add gem-book
```

</gbp-code-group>
````

## `<gbp-raw>`

Used to display remote code. If the provided `src` only contains a path, it will read content from the current project's GitHub (affected by [`sourceDir`](./002-cli.md#--source-dir) and [`sourceBranch`](./002-cli.md#--source-branch)), for example:

<gbp-raw src="package.json" range="2-3,-4--6,author-license" highlight="-5,author"></gbp-raw>

```md
<!-- `range` specifies the display range, supporting negative numbers and string matching, `highlight` format is the same -->

<gbp-raw src="package.json" range="2-3,-4--6,author-license" highlight="-5,author"></gbp-raw>
```

## `<gbp-var>`

Reference global variable: <gbp-var>hello</gbp-var>

```md
<gbp-var>hello</gbp-var>
```

The variable needs to be defined in the [configuration file](./002-cli.md).

## `<gbp-media>`

Displays remote multimedia content, such as images or videos, using the same resource retrieval method as `<gbp-raw>`:

```md
<gbp-media src="preview.png"></gbp-media>
```

## `<gbp-include>`

Dynamically loads Markdown snippets:

<gbp-include src="./guide/007-extension.md" range="[!NOTE]->"></gbp-include>

```md
<!-- `range` syntax is the same as `<gbp-raw>`, here `range` uses string matching -->

<gbp-include src="./guide/007-extension.md" range="[!NOTE]->"></gbp-include>
```

## `<gbp-import>`

Dynamically imports modules, which can be used to load plugins on demand. For example, the following custom element is dynamically loaded (the `.ts` file will be compiled using [esm.sh](https://esm.sh/)):

<gbp-import src="docs/hello.ts"></gbp-import>

<my-plugin-hello></my-plugin-hello>

```md
<gbp-import src="docs/hello.ts"></gbp-import>

<my-plugin-hello></my-plugin-hello>
```

## `<gbp-content>`

Insert content into `<gem-book>`, allowing customization of `<gem-book>` content on specific pages, such as a custom sidebar:

```md
<gbp-content slot="sidebar-before">
  <div>Test</div>
  <style>
    gem-book [part=sidebar-content] {
      display: none;
    }
  </style>
</gbp-content>
```

## `<gbp-docsearch>`

Use [Algolia DocSearch](https://docsearch.algolia.com/) to provide search for the website, instantiated only once, and can be placed using [slots](./guide/007-extension.md#slots):

<gbp-raw src="docs/template.html" range="13--4"></gbp-raw>

> [!WARNING]
>
> `renderJavaScript` must be enabled in the [configuration](https://crawler.algolia.com/admin/crawlers) for Algolia DocSearch Crawler.

Using `docsearch?local` can provide local search service (thanks to [MiniSearch](https://github.com/lucaong/minisearch/)), [example](https://duoyun-ui.gemjs.org).

## `<gbp-comment>`

It uses [Gitalk](https://github.com/gitalk/gitalk) to bring comment functionality to the website, similar to the usage of `<gbp-docsearch>`:

```html
<gem-book>
  <gbp-comment
    slot="main-after"
    client-id="xxx"
    client-secret="xxx"
  ></gbp-comment>
</gem-book>
```

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

## `<gbp-api>`

Use [`gem-analyzer`](https://github.com/mantou132/gem/blob/main/packages/gem-analyzer) to generate API documentation for `GemElement`, such as [GemBookElement API](./004-api.md);
