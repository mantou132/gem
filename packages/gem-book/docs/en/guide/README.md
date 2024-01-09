---
isNav: true
navTitle: Guide
---

# Introduction

GemBook renders [Markdown](https://zh.wikipedia.org/wiki/Markdown) content into a website and generates pages based on the directory structure.
GemBook is a document site generation tool created for [Gem](https://github.com/mantou132/gem). It is also written using Gem. It has a symbiotic relationship with Gem. It uses the custom element `<gem-book>` render content.

### Getting Started

You can try it online directly at [StackBlitz](https://stackblitz.com/edit/node-c7iw5d?file=README.md).

> [!WARNING]
> GemBook depends on [Node.js v18+](https://nodejs.org/), please ensure that the `node -v` command can be executed

<gbp-include src="../snippets/start.md"></gbp-include>

More [options](./003-cli.md).

<details>
<summary>

Use `<gem-book>`

</summary>

The above command uses `webpack` to package a complete front-end project, but you can also use the `<gem-book>` element directly in HTML.

```bash
# Install as dependency
npm install gem-book

# Only generate <gem-book> requires json configuration file
npx gem-book docs -t MyApp -i logo.png --home-mode --build --json
```

Then use `<gem-book>` in your project:

```js
import { html, render } from '@mantou/gem';
import 'gem-book';

import config from './gem-book.json';

render(html`<gem-book .config=${config}></gem-book>`, document.body);
```

You can use the `<gem-book>` element in any framework.

</details>

### Goal

- Build documentation into front-end projects
- Provide a command line to parse the directory into a `<gem-book>` configuration file
- Provide `<gem-book>` for front-end projects
- Provide API for users to extend
