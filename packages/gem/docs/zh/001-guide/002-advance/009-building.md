# 构建

## 通用插件（推荐）

[unplugin-gem](https://github.com/mantou132/gem/tree/main/packages/unplugin-gem) 为所有主流构建工具提供统一的插件。

支持：**Vite**、**Webpack**、**Rollup**、**esbuild**、**Rspack** 和 **Rolldown**。

使用方法请参考 [unplugin-gem 文档](https://github.com/mantou132/gem/tree/main/packages/unplugin-gem#readme)。

## SWC 插件

直接使用 SWC 时：

<gbp-code-group>

```bash npm
npm install swc-plugin-gem
```

```bash pnpm
pnpm install swc-plugin-gem
```

</gbp-code-group>

配置：

<gbp-raw src="https://raw.githubusercontent.com/mantou132/gem/main/crates/swc-plugin-gem/src/lib.rs" range="#[-}"></gbp-raw>
