# Extension

GemBook renders Markdown on the server and extends the Markdown syntax, custom elements can be used in Markdown to extend documents.

## Markdown enhancement

### Code blocks info string

Syntax:

```md
<language>? <filename>? <status>? <highlight>?
```

- `language`: The language of [syntax highlighting](https://highlightjs.org/), highlighted when building
- `filename`: Displayed above the code, it is also the tab name in [`<gbp-code-group>`](../003-plugins.md#gbp-code-group) and the file name in [`<gbp-sandpack>`](../003-plugins.md#gbp-sandpack)
- `status`: In code groups, `active` is displayed by default, `hidden` is not displayed in the tabs
- `highlight`: The lines to highlight, e.g. `1,3-5`, negative numbers count from the end

Use highlight example:

````md 1
# Code Block Info

```md 1
# Code Block Info
```
````

### Fixed heading anchor hash {#fixed-hash}

By default, hash is generated based on the title text field, but sometimes you need to fix the hash, such as internationalization.

```md
### Fixed heading anchor hash {#fixed-hash}
```

### Highlight blockquote

```md
> [!TIP]
> This is [highlight blockquote](https://github.com/orgs/community/discussions/16925)
```

> [!NOTE]
> This is `[!NOTE]`

> [!TIP]
> This is `[!TIP]`

> [!IMPORTANT]
> This is `[!IMPORTANT]`

> [!WARNING]
> This is `[!WARNING]`

> [!CAUTION]
> This is `[!CAUTION]`

## Page regions {#slots}

Use [`<gbp-content>`](../003-plugins.md#gbp-content) in a document to insert content into the regions of the page, the content is removed when leaving the page:
- `nav-inside`: In the navigation bar
- `sidebar-before`: At the top of the sidebar
- `main-before`: Before the document
- `main-after`: After the document

```md
<gbp-content slot="main-before">
  <p>This document is deprecated.</p>
</gbp-content>
```

## Plugins {#plugins}

GemBook uses custom elements as a plugin system, the [built-in plugins](../003-plugins.md) can be used in Markdown directly, for example:

```md
<gbp-raw src="package.json"></gbp-raw>
```

Some plugins are rendered on the server when building (e.g. `<gbp-raw>`, `<gbp-include>`, `<gbp-api>`), they don't load any code in the browser,
others are rendered on the server and work in the browser (e.g. `<gbp-code-group>`, `<gbp-sandpack>`).

> [!TIP]
>
> 1. Write the start tag of a plugin in one line, otherwise Markdown may treat it as text
> 2. VSCode cannot use [Emmet](https://code.visualstudio.com/docs/editor/emmet) in Markdown files by default. You can enable it through settings:
>
>    ```json
>    "emmet.excludeLanguages": [],
>    "emmet.includeLanguages": {"markdown": "html"},
>    ```

### Custom elements

Write your own plugins as custom elements, for example with [Gem](https://gemjs.org):

<gbp-raw src="docs/hello.ts"></gbp-raw>

Use [`<gbp-import>`](../003-plugins.md#gbp-import) to load it only on the pages that use it:

```md
<gbp-import name="my-plugin-hello" dependencies="canvas-confetti" src="docs/hello.ts"></gbp-import>
```

Or add it to [`plugins`](../002-cli.md#plugins) of the config file as a site-wide plugin, it is bundled with the website and its dependencies are installed in the project, then use the element in any document directly, Gem elements are also rendered on the server:

```md
<my-plugin-hello></my-plugin-hello>
```

### Plugin API

Bundled plugins (site-wide plugins and local [`<gbp-import>`](../003-plugins.md#gbp-import) modules) can import `gem-book/plugin`, it is available even if `gem-book` is not installed in the project (e.g. using `npx`):

```ts
import {
  adoptedStyle,
  connectStore,
  css,
  customElement,
  GemElement,
  html,
  template,
} from '@mantou/gem';
import { bookStore, getGlobal, theme } from 'gem-book/plugin';

const style = css`
  :scope {
    color: ${theme.primaryColor};
  }
`;

@customElement('my-page-info')
@adoptedStyle(style)
@connectStore(bookStore)
export class MyPageInfoElement extends GemElement {
  @template()
  #content = () => html`${bookStore.doc?.title} (${bookStore.lang}) v${getGlobal('version')}`;
}
```

- `bookStore`: the data of the website and the current page, also available when rendering on the server, updated when navigating
  - `config`: the config of the website
  - `lang`: the current language
  - `path`: the path of the current page without the language prefix, e.g. `/v1/guide`
  - `version`: the old version of the current page, empty for the latest version
  - `site`: the navigation and sidebar of the website, including old versions
  - `doc`: the current document (title, headings, etc.), empty on other pages (e.g. 404)
- `theme`: the [CSS variables](./005-theme.md#css-variables) of the theme, e.g. `theme.primaryColor`
- `getGlobal(name)`: the value of [`global`](../002-cli.md#global), `name` can be a path, e.g. `pkg.version`
- `htmlTemplate(html)`: renders an HTML string as a template, custom elements in it are also rendered on the server

`gem-book/plugin/server` is for code only executed on the server, such as [server elements](https://github.com/mantou132/gem/tree/main/packages/gem-ssr#server-elements) marked with `@server()`, the current document is the document of the current page:

```ts
import fs from 'node:fs';

import { createState, customElement, GemElement, html, mounted, template } from '@mantou/gem';
import { server } from '@mantou/gemkit';
import { htmlTemplate } from 'gem-book/plugin';
import { renderMarkdown, resolveSrc } from 'gem-book/plugin/server';

// Only outputs HTML, the code is not loaded in the browser
@customElement('my-changelog')
@server()
export class MyChangelogElement extends GemElement {
  #state = createState({ html: '' });

  @server()
  @mounted()
  #init = async () => {
    const resolved = resolveSrc(this.getAttribute('src') || '');
    if ('file' in resolved)
      this.#state({ html: await renderMarkdown(fs.readFileSync(resolved.file, 'utf8')) });
  };

  @template()
  #content = () => htmlTemplate(this.#state.html);
}
```

- `resolveSrc(src)`: resolves `src` like built-in plugins: a URL, or a file relative to the current document (starting with `.`) or the current working directory, supports [`importMap`](../002-cli.md#importmap)
- `renderMarkdown(md)`: renders Markdown like documents (syntax highlighting, relative links, server plugins), returns HTML
- `getGlobal(name)`: same as above
