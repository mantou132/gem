![npm](https://img.shields.io/npm/v/gem-book)
![npm](https://img.shields.io/npm/dw/gem-book)

# GemBook

Build documentation websites from Markdown quickly.

## Features

- One command, no project configuration: `npx gem-book docs`
- Every page is prerendered into HTML ([gemkit](https://github.com/mantou132/gem/tree/main/packages/gemkit)), deploy to any static hosting
- Markdown, syntax highlighting and API documentation are rendered when building, no extra JavaScript in the browser
- I18n, versioning, search, `llms.txt`, plugins (custom elements in Markdown) and more

## Documentation

- [Docs](https://book.gemjs.org/)

## Development

```bash
# Dev server of the docs of GemBook
pnpm docs

# Build the CLI
pnpm build
```

- `cli/`: the CLI and the Rsbuild plugin, generates `.gem-book/` (gemkit source directory) in the project
- `app/`: the pages, elements and Markdown rendering, published as source and compiled in the project
