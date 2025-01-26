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

`prettier` defaults to support the inline `html`/`css` template, but does not support`css({})`.
