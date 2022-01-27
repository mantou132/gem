---
isNav: true
navTitle: Guide
---

# Introduction

`<gem-book>` is a custom element, you only need to insert the element in the web page and specify the configuration file. Comes with command line `gem-book`, the command line allows to build complete front-end resources or only generate configuration files for use by `<gem-book>`.

> `<gem-book>` is a document generation tool created for [Gem](https://github.com/mantou132/gem), and it also uses Gem, and Gem is a symbiotic relationship.

### Installation

```bash
# If you only use the command line
# you can install it as a global dependency
npm -g install gem-book

# If you want to use <gem-book> by yourself
# please install it as a project dependency
npm install gem-book

```

### Getting Started

```bash
# Create docs
mkdir docs && echo '# Hello <gem-book>!' > docs/readme.md

# Write and preview
gem-book docs

# Specify title
gem-book docs -t MyApp

# Specify logo
gem-book docs -t MyApp -i logo.png

# Render readme.md/index.md as the project homepage
gem-book docs -t MyApp -i logo.png --home-mode

# Build front-end resources
gem-book docs -t MyApp -i logo.png --home-mode --build

```

More [options](./003-cli.md).

### Use `<gem-book>`

The above command uses `webpack` to package a complete front-end project, but you can also use the `<gem-book>` element directly in HTML.

```bash
# Only generate <gem-book> requires json configuration file
gem-book docs -t MyApp -i logo.png --home-mode --build --json
```

Then use `<gem-book>` in your project:

```js
import { html, render } from '@mantou/gem';

// import <gem-book>
import 'gem-book';

import config from './gem-book.json';

render(html`<gem-book .config=${config}></gem-book>`, document.body);
```

You can use the `<gem-book>` element in any framework.

### Rendering rules

The command line tool directly maps the directory structure to the sidebar structure. The level 1 and level 2 titles in the document will be used as the titles of the links in the sidebar. If there is no first-level title, the file name will be used.

### Goal

- Build documentation into front-end projects
- Provide a command line to parse the directory into a `<gem-book>` configuration file
- Provide `<gem-book>` for front-end projects
- Provide API for users to extend

### No-Goal

- Provide website server

### Browser compatibility

| Chrome Latest | Firefox Latest | Safari Latest |
| ------------- | -------------- | ------------- |
| ✅            | ✅             | ✅            |
