# Extension

`<gem-book>` renders Markdown and also extends the Markdown syntax. In addition, some methods are provided for users to customize `<gem-book>`.

## Markdown enhancement

### Code blocks info string

Syntax:

```md
<language>? <filename>? <status>? <highlight>?
```

Here is an example of writing code blocks in `<gbp-sandpack>` [plugin](#plugins):

<gbp-sandpack dependencies="@mantou/gem">

```js index.js
import { render } from '@mantou/gem';

render('This is `<gbp-sandpack>` example', document.getElementById('root'));
```

````md README.md active 12-13
<gbp-sandpack dependencies="@mantou/gem">

```js index.js
import { render } from '@mantou/gem';

render('This is `<gbp-sandpack>` example', document.getElementById('root'));
```

```md README.md active 3-4
# `<gbp-sandpack>`

- Code block represents a file in `<gbp-sandpack>`
- The default state of the first file is `active`, if you manually specify the state, you must write the filename
```

</gbp-sandpack>
````

</gbp-sandpack>

_`filename` only work in `<gbp-sandpack>`; `highlight` does not refer to code syntax highlighting_

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

> [!TIP]
> This is [highlight blockquote](https://github.com/orgs/community/discussions/16925)

Support for `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]` and `[!CAUTION]`.

## Parts

[Part](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/part) allows you to customize the internal style of `<gem-book>`, for example:

```css
gem-book::part(homepage-hero) {
  background: #eee;
}
```

## Slots

[Slot](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/slot) allows you to customize `<gem-book>` but the content, currently supported slots are `sidebar-before`, `main-before`, `main-after`, `nav-inside`.

```html
<gem-book><div slot="sidebar-before">Hello</div></gem-book>
```

_Can use `--template` specified template file_

## Plugins {#plugins}

### Use plugin

`<gem-book>` uses custom elements as a plugin system, they can customize the rendering of Markdown content or enhance the ability of `<gem-book>`. The following is how to use the built-in plugin `<gbp-raw>`.

import plugin:

<gbp-code-group>

```bash CLI
gem-book docs --plugin raw
```

```html HTML
<script type="module" src="https://unpkg.com/gem-book/plugins/raw.js"></script>
```

</gbp-code-group>

Then use it in Markdown to render files in the warehouse:

```md
<gbp-raw src="/src/plugins/raw.ts"></gbp-raw>
```

> [!TIP]
> Attribute should not be line break when using a plugin in Markdown,
> otherwise it will be interrupted by the `<p>` tag as the inline element.

Some plugin need to be used with slots, such as the built-in plugin `<gbp-comment>`, which uses [Gitalk](https://github.com/gitalk/gitalk) to bring comments to the website:

```html
<gem-book>
  <gbp-comment
    slot="main-after"
    client-id="xxx"
    client-secret="xxx"
  ></gbp-comment>
</gem-book>
```

> [!NOTE]
> GemBook built-in plugin supports automatic import,
> the disadvantage is that it will be loaded after rendering documents. It is possible that the page will flash

### Plugin development

Any element can be used as a plugin, but if you want to read the data of `<gem-book>` like `<gbp-raw>`, you need to use `GemBookPluginElement`, which extends from [`GemElement`](https://gemjs.org/api/), obtain `GemBookPluginElement` and read `<gem-book>` configuration in the following way.

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
