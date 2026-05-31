# unplugin-gem

Universal plugin for [Gem](https://github.com/mantou132/gem) element transformations.

Supports **Vite**, **Webpack**, **Rollup**, **esbuild**, **Rspack** and **Rolldown** through a single unified API.

## Features

- 🔄 **Auto Import** - Automatically import Gem APIs
- 🎨 **CSS Minification** - Minify CSS in `css`` template literals
- 🔍 **Selector Compatible** - Transform `&:hover` for Shadow DOM compatibility
- 📦 **Resource Preload** - Preload resources with `?preload` query
- 🔥 **HMR Support** - Hot module replacement (experimental)
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
    }),
  ],
})
```

## How It Works

This plugin wraps [swc-plugin-gem](https://github.com/mantou132/gem/tree/main/crates/swc-plugin-gem) and uses [unplugin](https://github.com/unjs/unplugin) to provide universal bundler support.

## License

MIT
