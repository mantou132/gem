# 开发

下面的方法来提高 Gem 开发体验。

## HTML CSS 模版语言支持

安装扩展：

- [VSCode](https://marketplace.visualstudio.com/items?itemName=gem-vscode.vscode-plugin-gem)
- [Zed](https://zed.dev/extensions?query=gem)

> [!TIP]
> 由于 Zed 的扩展能力[缺失](https://github.com/zed-industries/zed/issues/22410)一些功能，需要使用手动配置 TypeScript 语言服务插件 `ts-gem-plugin`

## 自动格式化

### Prettier

`prettier` 默认支持内联 `html`/`css` 模版，但不支持 `css({})`，使用下面的命令安装 `prettier`
以支持这种样式的格式化：

```sh
pnpm add -D prettier@npm:@mantou/prettier
```


### Biome

`Biome` 默认支持内联 `html`/`css` 模版，但不支持 `css({})`。
