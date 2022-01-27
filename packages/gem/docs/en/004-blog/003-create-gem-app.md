# Use `create-gem-app` to build a front-end project

[`create-gem-app`](https://github.com/mantou132/create-gem-app) is a command line tool that can quickly build your front-end project based on the template repo:

```bash
npx create-gem-app my-app
code my-app
```

### Directory structure

```
src
├── elements    # Organize custom elements commonly used in projects
├── pages       # Route-level elements in the organization project
├── service     # RESTFul API call and data type definition
├── store       # Organize `Store` by Module
├── types       # Type definition of front-end resources and modules
├── main.ts     # Project entry file
├── index.ts    # Project root element definition
├── routes.ts   # Route definition
└── logo.svg
```

### Import dependencies using absolute paths

Use [`tsconfig-paths-webpack-plugin`](https://github.com/dividab/tsconfig-paths-webpack-plugin) to allow you to import dependencies using absolute paths in the module:

```ts
import 'src/elements/nav';

import routes from 'src/routes';
```

Using absolute paths can make you more aware of what you depend on.

### PWA support

The project uses [`workbox-webpack-plugin`](https://github.com/GoogleChrome/workbox) and [`webpack-pwa-manifest`](https://github.com/arthurbergmz/webpack-pwa-manifest) Added PWA support, you can customize the details according to your project in `webpack.config.json`.

### Mock API

The project comes with the Mock API function, use the following command to enable the Mock function:

```bash
npm run dev
```

Use [`intermock`](https://github.com/google/intermock) to generate content based on the RESTFul API type definition:

```ts
// src/service/api.ts
// RESTFul API response type definition
export interface Post {
  id: number;
  userId: number;
  title: string;
  body: string;
}
```

```js
// mock/api.js
// mock file
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

### Other templates

`create-gem-app` uses [`gem-boilerplate`](https://github.com/mantou132/gem-boilerplate) as a template by default. In fact, it also supports other templates that use Gem:

- `lib`: Suitable for building UI libraries based on `GemElement`
- `wasm`: Used to build a custom element library with Rust/WebAssembly

You can specify the template with the `-t` parameter:

```bash
npx create-gem-app my-app -t lib
# or
npx create-gem-app my-app -t wasm
```
