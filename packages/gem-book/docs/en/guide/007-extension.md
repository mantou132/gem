# Extension

`<gem-book>` renders Markdown and also extends the Markdown syntax. In addition, some methods are provided for users to customize `<gem-book>`.

## Markdown enhancement

### Code blocks info string

Syntax:

```md
<language>? <filename>? <status>? <highlight>?
```

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

## Slots

[Slot](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/slot) allows you to customize `<gem-book>` but the content, currently supported slots are `sidebar-before`, `main-before`, `main-after`, `nav-inside`.

<gbp-raw src="docs/template.html" range="8--4"></gbp-raw>

_Can use `--template` specified template file_

## Plugins {#plugins}

### Use plugin

GemBook uses custom elements as a plugin system, they can customize the rendering of Markdown content or enhance the ability of `<gem-book>`. The following is how to use the built-in plugin `<gbp-raw>`.

import plugin:

<gbp-code-group>

```bash cli
gem-book docs --plugin raw
```

```html html
<script type="module" src="https://unpkg.com/gem-book/plugins/raw.js"></script>
```

</gbp-code-group>

Then use it in Markdown to render files in the warehouse:

```md
<gbp-raw src="/src/plugins/raw.ts"></gbp-raw>
```

> [!TIP]
>
> 1. Attribute should not be line break when using a plugin in Markdown, otherwise it will be interrupted by the `<p>` tag as the inline element.
> 2. GemBook built-in plugin supports automatic import, the disadvantage is that it will be loaded after rendering documents. It is possible that the page will flash
> 3. VSCode cannot use [Emmet](https://code.visualstudio.com/docs/editor/emmet) in MarkDown files by default. You can enable it through settings:
>
>    ```json
>    "emmet.excludeLanguages": [],
>    "emmet.includeLanguages": {"markdown": "html"},
>    ```

### Plugin development

GemBook exposes a class `GemBookPluginElement`, which extends from [`GemElement`](https://gemjs.org/api/),
[Contains](../004-api.md#gem-book-plugin-api) many internal methods and properties, get the `GemBookPluginElement` and read the `<gem-book>` configuration in the following way:

```js
customElements.whenDefined('gem-book').then(({ GemBookPluginElement }) => {
  customElements.define(
    'gbp-example',
    class extends GemBookPluginElement {
      constructor() {
        super();
        console.log(GemBookPluginElement.config);
      }
    },
  );
});
```
