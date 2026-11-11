# Gemkit

A [Gem](https://gemjs.org) application framework built on [Rsbuild](https://rsbuild.rs): file-based routing,
layouts, i18n, SSR and SSG.

![Client JavaScript](https://raw.githubusercontent.com/mantou132/realworld/framework-comparison/frameworks/bench/results/charts/1-js.png)

See the [benchmark](https://gemkit.gemjs.org/en#benchmark) for SSR throughput, Lighthouse and navigation results.

## Quick start

```sh
npm create gemkit@latest my-app
cd my-app
npm install
npm run dev
```

Or add Gemkit to an existing Rsbuild project:

```ts
// rsbuild.config.ts
import { pluginGemkit } from '@mantou/gemkit/plugin';
import { defineConfig } from '@rsbuild/core';

export default defineConfig({
  plugins: [pluginGemkit({ title: 'My Site', titleTemplate: '%s | My Site' })],
});
```

## Documentation

- [Guide](https://gemkit.gemjs.org/en/guide)
- [Reference](https://gemkit.gemjs.org/en/reference)
- [中文文档](https://gemkit.gemjs.org/zh)

## License

MIT
