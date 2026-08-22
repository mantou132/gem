# unplugin-gem

Universal plugin for [Gem](https://github.com/mantou132/gem) element transformations.

Supports **Vite**, **Webpack**, **Rollup**, **esbuild**, **Rspack** and **Rolldown** through a single unified API.

## Features

- 🔄 **Auto Import** - Automatically import Gem APIs
- 🎨 **CSS Minification** - Minify CSS in `css`` template literals
- 🔍 **Selector Compatible** - Transform `&:hover` for Shadow DOM compatibility
- 📦 **Resource Preload** - Preload resources with `?preload` query
- 🔥 **HMR Support** - Injects `@mantou/gem/helper/hmr` automatically (experimental)
- 🛠️ **Universal** - Works with all major bundlers

## Installation

```bash
npm install unplugin-gem
# or
pnpm add unplugin-gem
# or
yarn add unplugin-gem
```

## Usage

### Vite

```ts
// vite.config.ts
import gemPlugin from 'unplugin-gem/vite'

export default {
  plugins: [
    gemPlugin({
      autoImport: true,
      selectorCompatible: true,
      styleMinify: true,
      hmr: true,
    }),
  ],
}
```

### Webpack

```js
// webpack.config.js
const gemPlugin = require('unplugin-gem/webpack')

module.exports = {
  plugins: [
    gemPlugin({
      autoImport: true,
      selectorCompatible: true,
      hmr: true,
    }),
  ],
}
```

### Rollup

```js
// rollup.config.js
import gemPlugin from 'unplugin-gem/rollup'

export default {
  plugins: [
    gemPlugin({
      autoImport: true,
      selectorCompatible: true,
      hmr: true,
    }),
  ],
}
```

### Rspack

```js
// rspack.config.js
import gemPlugin from 'unplugin-gem/rspack'

export default {
  plugins: [
    gemPlugin({
      autoImport: true,
      selectorCompatible: true,
      hmr: true,
    }),
  ],
}
```

### Rolldown

```js
// rolldown.config.js
import gemPlugin from 'unplugin-gem/rolldown'

export default {
  plugins: [
    gemPlugin({
      autoImport: true,
      selectorCompatible: true,
      hmr: true,
    }),
  ],
}
```

### esbuild

```js
// esbuild.config.js
import { build } from 'esbuild'
import gemPlugin from 'unplugin-gem/esbuild'

build({
  plugins: [
    gemPlugin({
      autoImport: true,
      selectorCompatible: true,
      hmr: true,
    }),
  ],
})
```

## HMR

Enable `hmr` to run [swc-plugin-gem](https://github.com/mantou132/gem/tree/main/crates/swc-plugin-gem)'s HMR transform and inject `@mantou/gem/helper/hmr`. You do not add the runtime yourself.

```ts
gemPlugin({
  hmr: true,
})
```

The runtime is injected for every supported bundler:

- **Webpack / Rspack**: prepended to each entry
- **Vite**: injected as a module script during `serve`
- **Rollup / Rolldown**: each selected input is wrapped so the helper runs first
- **esbuild**: added through `inject` (or an entry proxy when `hmr.include` is set)

Keep `hmr` off in production builds. The transform emits `import.meta.webpackHot` on webpack/Rspack and `import.meta.hot` elsewhere. Service worker / background / content script / Node entries are skipped by default because the runtime uses `window`.

Complete JavaScript HMR still needs a host that implements those APIs (webpack/Rspack/Vite, or Rolldown's experimental HMR). Rollup and esbuild only get the runtime so the transformed classes stay compatible.

## How It Works

This plugin wraps [swc-plugin-gem](https://github.com/mantou132/gem/tree/main/crates/swc-plugin-gem) and uses [unplugin](https://github.com/unjs/unplugin) to provide universal bundler support.

## License

MIT
