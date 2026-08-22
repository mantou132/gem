# 开发

下面的方法来提高 Gem 开发体验。

## HTML CSS 模版语言支持

安装扩展：

- [VSCode](https://marketplace.visualstudio.com/items?itemName=gem-vscode.vscode-plugin-gem)
- [Zed](https://zed.dev/extensions?query=gem)

## 自动格式化

### Prettier

`prettier` 默认支持内联 `html`/`css` 模版，但不支持 `css({})`，使用下面的命令安装 `prettier`
以支持这种样式的格式化：

```sh
pnpm add -D prettier@npm:@mantou/prettier
```


### Biome

`Biome` v2 默认支持内联 `html`/`css` 模版，但不支持 `css({})`。

## HMR

通过 [unplugin-gem](./009-building.md)，HMR 可用于 webpack、Rspack、Vite、Rollup、Rolldown 和 esbuild。

### unplugin-gem（推荐）

在有 JS HMR host 的构建工具中开启 `hot`，并启用 `hmr`。插件会自动注入 `@mantou/gem/helper/hmr`：

```ts
unpluginGem({
  hmr: true,
})
```

完整的 JavaScript HMR 仍需要 host 提供 `import.meta.webpackHot`（webpack/Rspack）或 `import.meta.hot`（Vite / 实验性 Rolldown）。Rollup 和 esbuild 只会注入运行时，以保持类更新兼容。

### SWC 插件

直接使用 [swc-plugin-gem](./009-building.md) 时：

1. 在构建工具中开启 `hot`，例如 [Webpack](https://webpack.js.org/guides/hot-module-replacement)
2. 在构建工具配置中入口添加 `@mantou/gem/helper/hmr`（必须在任何元素类定义之前执行）
3. 在 SWC 插件配置中开启 `hmr`（`true` / `"webpack-hot"`、`"import-meta-hot"` 或 `"module-hot"`）
