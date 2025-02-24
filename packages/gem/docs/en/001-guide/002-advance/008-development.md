# Development

The following method is to improve the Gem development experience.

## Language Support

Install extension:

- [VSCode](https://marketplace.visualstudio.com/items?itemName=gem-vscode.vscode-plugin-gem)
- [Zed](https://zed.dev/extensions?query=gem)

> [!TIP]
> Due to the expansion capabilities of Zed [missing](https://github.com/zed-industries/zed/issues/22410), you need to use the manual configuration TypeScript language service plugin `ts-gem-plugin`

## Formatting

### Prettier

`prettier` defaults to support the inline `html`/`css` template, but does not support`css({})`, use the following command to install `prettier`
To support the formatting of this style:

```sh
pnpm add -D prettier@npm:@mantou/prettier
```

### Biome

`biome` v2 defaults to support the inline `html`/`css` template, but does not support`css({})`.

## HMR

Enable HMR in three steps:

1. Turn on `hot` in the build tool, such as [Webpack](https://webpack.js.org/guides/hot-module-replacement)
2. Add `@mantou/gem/helper/hmr` to build tool config entry
3. Add [swc plugin](./009-building.md) and enable `hmr`