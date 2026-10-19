# Theme

The colors, fonts and sizes of the website are defined by the theme.

## Default theme

<gbp-raw src="app/lib/default-theme.ts" range="1--4"></gbp-raw>

## Custom theme

Use the config [`theme`](../002-cli.md#theme) to provide the name of a [built-in theme](https://github.com/mantou132/gem/tree/main/packages/gem-book/themes)
or the path of a theme file in `JSON` format or a module that default exports the theme, the theme only needs to contain the values to be modified:

```json
{
  "theme": "dark"
}
```

<gbp-raw src="themes/dark.js"></gbp-raw>

## CSS variables

The theme is defined as CSS variables on `:root`, for example `primaryColor` is `--gem-book-primary-color`,
you can also modify them with CSS on specific pages, for example using [`<gbp-content>`](../003-plugins.md#gbp-content):

```md
<gbp-content>
  <style>
    :root {
      --gem-book-primary-color: tomato;
    }
  </style>
</gbp-content>
```
