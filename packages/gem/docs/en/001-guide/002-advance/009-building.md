# Building

## Universal Plugin (Recommended)

[unplugin-gem](https://github.com/mantou132/gem/tree/main/packages/unplugin-gem) provides a unified plugin for all major bundlers.

Supports: **Vite**, **Webpack**, **Rollup**, **esbuild**, **Rspack** and **Rolldown**.

See [unplugin-gem documentation](https://github.com/mantou132/gem/tree/main/packages/unplugin-gem#readme) for usage.

## SWC Plugin

For direct SWC usage:

<gbp-code-group>

```bash npm
npm install swc-plugin-gem
```

```bash pnpm
pnpm install swc-plugin-gem
```

</gbp-code-group>

Config:

<gbp-raw src="https://raw.githubusercontent.com/mantou132/gem/main/crates/swc-plugin-gem/src/lib.rs" range="#[-}"></gbp-raw>
