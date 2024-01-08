# Theme

The `<gem-book>` element provides the theme API, which can be very convenient to customize the theme.

## Default theme

<gbp-raw src="src/element/helper/default-theme.ts"></gbp-raw>

## Custom theme

You can directly use the cli options to provide the theme file path in `json`/`CommonJs` format or [build-in theme](https://github.com/mantou132/gem/tree/master/packages/gem-book/themes) name:

```bash
gem-book docs --theme path/my-theme
gem-book docs --theme dark
```

Of course, you can also set the theme directly using the DOM API of `<gem-book>`.

<gbp-code-group>

```js vanilla.js
new GemBookElement(config, theme);
```

```js lit
html`<gem-book .config=${config} .theme=${theme}></gem-book>`;
```

</gbp-code-group>
