# Gemkit

A [Gem](https://gemjs.org) application framework built on [Rsbuild](https://rsbuild.rs): file-based routing,
layouts, i18n, SSR and SSG.

## Quick start

```sh
npm create gemkit@latest my-app
cd my-app
pnpm install
pnpm dev
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
