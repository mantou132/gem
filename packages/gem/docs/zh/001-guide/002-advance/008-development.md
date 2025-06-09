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

启用 HMR 分三步（只支持基于 `swc` 的捆绑器）：

1. 在构建工具中开启 `hot`，例如 [Webpack](https://webpack.js.org/guides/hot-module-replacement)
2. 在构建工具配置中入口添加 `@mantou/gem/helper/hmr`
3. 添加 [swc 插件](./008-development.md)并开启 `hmr`