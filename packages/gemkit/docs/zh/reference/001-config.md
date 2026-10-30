# 配置

Gemkit 是一个 Rsbuild 插件，在 `rsbuild.config.ts` 中添加：

```ts
import { defineConfig } from '@rsbuild/core';
import { pluginGemkit } from '@mantou/gemkit/plugin';

export default defineConfig({
  plugins: [
    pluginGemkit({
      title: '我的网站',
      titleTemplate: '%s | 我的网站',
    }),
  ],
});
```

## 插件选项

### `title`

- 类型：`string`
- 默认值：`''`

网站标题，页面没有 `title` 选项时使用。

### `titleTemplate`

- 类型：`string`
- 默认值：`'%s'`

标题模板，第一个 `%s` 会替换成页面标题。模板中没有 `%s` 时页面标题会被忽略。

### `srcDir`

- 类型：`string`
- 默认值：`'src'`

包含 `pages`、`locales`、`elements`、`app.ts`、`app.server.ts`、`app.client.ts` 和 `index.html` 的目录。
相对于项目根目录，可以指向提供页面的其他包。`.gemkit` 和 `dist` 仍然生成在项目根目录。

### `defaultLanguage`

- 类型：`string`
- 默认值：存在 `en.json` 时是 `'en'`，否则是文件名排序后的第一个语言

默认语言默认没有 URL 前缀，除非开启 `prefixDefaultLanguage`。默认语言必须有语言文件。

### `prefixDefaultLanguage`

- 类型：`boolean`
- 默认值：`false`

默认语言也使用路径前缀，例如 `/en/about`。没有前缀的路径跳转到用户上次使用的语言、浏览器偏好的语言或者默认语言，
静态托管时也一样，见[国际化](../guide/009-i18n.md#没有前缀的路径)。

### `prerender`

- 类型：`boolean`
- 默认值：`true`

在构建时预渲染静态路由和 `paths` 返回的动态路由。为 `false` 时所有页面按请求渲染，需要服务器。

单个页面或者布局可以在服务端模块中导出 `export const prerender = false` 来关闭，
在布局中设置会对它下面的所有页面生效。

### `adapter`

- 类型：`GemkitAdapter | false`
- 默认值：根据构建环境识别

部署平台，构建时输出平台需要的文件，见[部署平台](../guide/011-deploy.md#部署平台)。
内置的 `vercel()`、`netlify()`、`cloudflare()` 从 `@mantou/gemkit/plugin` 导入：

```ts
import { cloudflare, pluginGemkit } from '@mantou/gemkit/plugin';

pluginGemkit({ adapter: cloudflare() });
```

没有设置时，在 Vercel、Netlify 上构建时根据它们设置的环境变量识别，Cloudflare Workers Builds 中或者项目根目录有
Wrangler 配置时使用 `cloudflare()`。都没有或者为 `false` 时使用 Node.js（`gemkit start` 或者静态托管）。
开发时总是使用 Node.js。

### `gem`

- 类型：`UnpluginGemOptions`
- 默认值：`undefined`

传递给 [unplugin-gem](https://github.com/mantou132/gem/tree/main/packages/unplugin-gem) 的选项。
Gemkit 会设置包含路径、Gem API、常用的 `@mantou/gemkit` API（`HttpError`、`formatTitle` 和类型除外）、`i18n`、
`apis` 和 `<srcDir>/elements` 元素的自动导入、样式和 HTML 压缩、选择器兼容、preload 和 SSR，
开发时启用 HMR。这里的选项会覆盖这些默认值，`hmr` 仍然可以单独覆盖。

`autoImport` 则和 Gemkit 的默认值合并，键是包名或者别名，不是文件路径。
`src` 是 `<srcDir>` 的别名（打包工具和 `.gemkit/tsconfig.json` 中都有），默认 `<app-foo>` 会导入
`src/elements/foo`，设置 `elements.src` 会替换这个默认值：

```ts
pluginGemkit({
  gem: {
    autoImport: {
      members: { 'src/utils': ['format'] },
      elements: {
        src: { 'app-*': '/components/*' },
        'my-ui': { 'my-*': '/elements/*' },
      },
    },
  },
});
```

## 生成的文件

Gemkit 在 `.gemkit` 中生成：

| 文件               | 说明                                                               |
| ------------------ | ------------------------------------------------------------------ |
| `client.ts`        | 客户端入口，根据页面和预渲染状态生成。                             |
| `server.ts`        | 服务端入口，SSR 构建和预渲染使用。                                 |
| `handler.ts`       | 部署平台的函数入口，使用 `adapter` 时生成。                        |
| `routes.ts`        | 路由表。                                                           |
| `i18n.ts`          | `$gemkit/i18n`，见[国际化](../guide/009-i18n.md)。                 |
| `api.ts`           | `$gemkit/api`，见 [API 路由](../guide/006-api-routes.md)。         |
| `env.d.ts`         | 资源模块和 `@rsbuild/core/types` 的类型声明。                      |
| `auto-import.d.ts` | `@mantou/gemkit`、`$gemkit/*` 和 `gem.autoImport` 的自动导入类型。 |
| `tsconfig.json`    | 路径别名和类型，在项目的 `tsconfig.json` 中继承它。                |

`.gemkit` 会被 Git 忽略。继承它的 tsconfig 才能获得 `$gemkit/*` 和自动导入的类型：

```json
{
  "extends": "./.gemkit/tsconfig.json"
}
```

生成的文件在每次构建时覆盖。除了 `$gemkit/i18n` 和 `$gemkit/api`，不要直接导入它们。

## 构建产物

| 目录          | 内容                                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------ |
| `dist/web`    | 客户端资源、预渲染的页面、`__data.json`、`__elements.json`、`404.html`，Node.js 部署时还有压缩的 `.br`、`.gz` 文件 |
| `dist/server` | SSR 产物和 HTML 模板。                                                                                             |
| `dist/cache`  | ISR 页面缓存，构建时清空。                                                                                         |

客户端构建之后，HTML 模板会从 `dist/web` 中移走，避免静态托管把它当作首页。
见[部署](../guide/011-deploy.md)。

## 环境变量

| 变量               | 说明                                                                   |
| ------------------ | ---------------------------------------------------------------------- |
| `PORT`             | `gemkit start` 的端口，默认 `3000`。                                   |
| `HOST`             | `gemkit start` 监听的地址，默认监听所有地址。                          |
| `ORIGIN`           | `gemkit start` 的公开地址，`url`、`Secure` cookie 和同源检查使用。     |
| `GEMKIT_PRERENDER` | 构建时设置。`'false'` 表示没有预渲染，客户端会跳过 `__elements.json`。 |

## 渲染器

`@mantou/gemkit/server` 导出 `createRenderer(options)`。它创建构建和 `gemkit start` 使用的渲染器，
参数包括应用、服务端模块、API 路由、i18n 和标题选项。这是给自带服务器的集成使用的高级 API，
普通应用使用 `gemkit start`，自定义 Node.js 服务器使用 `@mantou/gemkit/node`，见[自定义服务器](../guide/011-deploy.md#自定义服务器)。
