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

### 支持范围

能正确热更新：

- 方法、getter/setter、箭头函数字段的函数体（包括私有和静态成员），例如模板、`@effect`、`@memo` 的内容及其依赖，以及构造函数体（对之后创建的元素生效）
- 增删 `@attribute`、`@property`、`@emitter`、`@state`、`@part`、`@slot` 字段
- 样式（`@adoptedStyle`、`css`），支持 Light DOM
- 模块顶层的常量和函数
- 保留状态：元素实例的字段和 `createState`，以及模块顶层 `createStore` 创建的 store
- 更新后的代码中使用 `new MyElement()` 创建元素

会刷新页面：

- 增删方法或函数字段
- 增删没有装饰器的普通实例字段
- 修改 `@shadow`、`@light({ penetrable })`、`@async`
- `@connectStore` 连接的 store 有增减，或者连接的是本地 store、但不是模块顶层 `createStore` 创建的
- 构造函数中有 `super(参数)`、`new.target`、TS 参数属性或带值的 `return`

在 Vite 中，如果这样的模块被另一个元素模块导入，修改可能被忽略而不会刷新，需要手动刷新页面。

能热更新，但不保证可靠：

- 除 `@effect`、`@memo` 依赖外，装饰器参数的修改不生效，例如 `@template` 的条件和 `@aria`
- 字段初始值、store 初始值的修改不生效，因为它们被当作状态保留
- 模块顶层除 `createStore` 外的可变变量（例如 `let` 变量、用作缓存的 `Map`）会在模块更新后重置
- 静态字段值的修改只对模块内通过类名读取生效，通过 `this.constructor`、`customElements.get()` 读取的仍是旧值
- 计算属性名的成员不参与热更新
- 模块顶层的副作用会重复执行，例如事件监听、定时器、入口中的 `render`
- 修改过的模板字面量（`html`）对应的 DOM 会重建，其中的输入框焦点、子元素状态等会丢失；未修改的模板会复用已有 DOM
- 父类更新时，新增字段只会添加到当前更新标签的实例上
- 没有元素定义的模块（工具函数、store 模块）更新后会交给导入它的模块处理，不在这条更新链上的其他模块仍使用旧版本
