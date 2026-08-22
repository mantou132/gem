# Development

The following method is to improve the Gem development experience.

## Language Support

Install extension:

- [VSCode](https://marketplace.visualstudio.com/items?itemName=gem-vscode.vscode-plugin-gem)
- [Zed](https://zed.dev/extensions?query=gem)

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

HMR is available through [unplugin-gem](./009-building.md) on webpack, Rspack, Vite, Rollup, Rolldown and esbuild.

### unplugin-gem (recommended)

Turn on `hot` in the bundler when it has a JS HMR host, then enable `hmr`. The plugin injects `@mantou/gem/helper/hmr` automatically:

```ts
unpluginGem({
  hmr: true,
})
```

Complete JavaScript HMR still needs a host that implements `import.meta.webpackHot` (webpack/Rspack) or `import.meta.hot` (Vite / experimental Rolldown). Rollup and esbuild only get the runtime so class updates stay compatible.

### SWC plugin

When using [swc-plugin-gem](./009-building.md) directly:

1. Turn on `hot` in the build tool, such as [Webpack](https://webpack.js.org/guides/hot-module-replacement)
2. Add `@mantou/gem/helper/hmr` to the bundler entry (it must run before any element class is defined)
3. Enable `hmr` in the SWC plugin config (`true` / `"webpack-hot"`, `"import-meta-hot"`, or `"module-hot"`)
