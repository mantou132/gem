# 使用 CGA 搭建前端项目

[`create-gem-app`](https://github.com/mantou132/create-gem-app) 是一个命令行工具，可以快速基于模版仓库搭建你的前端项目：

```bash
npx create-gem-app my-app
code my-app
```

## 目录结构

```
src
├── elements    # 组织项目中通用的自定义元素
├── pages       # 组织项目中路由级元素
├── service     # RESTFul API 调用以及数据类型定义
├── store       # 按模块组织 `Store`
├── types       # 前端资源、模块的类型定义
├── main.ts     # 项目入口文件
├── index.ts    # 项目根元素定义
├── routes.ts   # Route 定义
└── logo.svg
```

## 使用绝对路径导入依赖

利用 [`tsconfig-paths-webpack-plugin`](https://github.com/dividab/tsconfig-paths-webpack-plugin) 让你能在模块中使用绝对路径导入依赖：

```ts
import 'src/elements/nav';

import routes from 'src/routes';
```

使用绝对路径能让你更加清楚依赖的内容。

## PWA 支持

项目使用 [`workbox-webpack-plugin`](https://github.com/GoogleChrome/workbox) 和 [`webpack-pwa-manifest`](https://github.com/arthurbergmz/webpack-pwa-manifest) 添加了 PWA 的支持，可以在 `webpack.config.json` 中根据你的项目自定义细节。

## Mock API

项目自带 Mock API 的功能，使用下面的命令启用 Mock 功能：

```bash
npm run dev
```

使用 [`intermock`](https://github.com/google/intermock) 根据 RESTFul API 类型定义生成内容：

```ts
// src/service/api.ts
// RESTFul API 响应的类型定义
export interface Post {
  id: number;
  userId: number;
  title: string;
  body: string;
}
```

```js
// mock/api.js
// mock 文件
const proxy = {
  '/api/posts': Array(100)
    .fill(null)
    .map(
      () =>
        mock({
          files: readFiles(['../src/service/api.ts']),
        })['Post'],
    ),
};
```

## 其他模版

`create-gem-app` 默认使用 [`gem-boilerplate`](https://github.com/mantou132/gem-boilerplate) 作为模版，实际上，它还支持其他使用 Gem 的模版：

- `lib`: 适用于搭建基于 `GemElement` 的 UI 库
- `wasm`: 使用于搭建应用了 Rust/WebAssembly 的自定义元素库

你可以使用 `-t` 参数指定模版：

```bash
npx create-gem-app my-app -t lib
# 或
npx create-gem-app my-app -t wasm
```
