# ts-gem-lsp

[Gem](https://github.com/mantou132/gem) language features for TypeScript 7.

TypeScript 7 (`tsc --lsp`) no longer loads tsserver plugins, so [ts-gem-plugin](../ts-gem-plugin) does not work with it. ts-gem-lsp provides the same features through the TypeScript 7 API:

- **LSP proxy** (`ts-gem-lsp`): starts the project's `tsc --lsp` and adds Gem features to its responses, for Zed and other LSP editors
- **VS Code middleware**: used by the [VS Code extension](../vscode-gem-plugin) through the TypeScript 7 extension's `registerLspMiddleware`
- **CLI** (`ts-gem`): runs diagnostics and editor requests from the command line

The TypeScript API is loaded from the project's own `typescript` package, so it always matches the running language server. When the project does not use TypeScript 7, the proxy starts a server without any capabilities, keep using ts-gem-plugin in that case.

## Features

- HTML templates (`html`, `raw`, `h`)
  - Completion, hover, folding, highlight, linked editing, closing tag, emmet
  - Custom element tag/attribute/property/event completion and validation
  - Go to definition, find references and rename for tags and properties
- CSS templates (`css`, `styled`, `<style>`)
  - Completion, hover, validation, folding, emmet
  - Class name completion from element styles, go to definition and find references
  - Element selector and custom property navigation, custom property rename
- Gem API
  - `@effect`/`@memo`/`@template` etc. allow unused private fields
  - Theme key completion, hide `never` members of state

## Zed

The [Gem extension](../../crates/zed-plugin-gem) installs and starts ts-gem-lsp automatically. It replaces the built-in TypeScript server, so disable the others for TypeScript 7 projects in `.zed/settings.json`:

```json
{
  "languages": {
    "TypeScript": {
      "language_servers": [
        "ts-gem-lsp",
        "!vtsls",
        "!typescript-language-server",
        "..."
      ]
    },
    "TSX": {
      "language_servers": [
        "ts-gem-lsp",
        "!vtsls",
        "!typescript-language-server",
        "..."
      ]
    },
    "JavaScript": {
      "language_servers": [
        "ts-gem-lsp",
        "!vtsls",
        "!typescript-language-server",
        "..."
      ]
    }
  },
  "lsp": {
    "ts-gem-lsp": {
      "settings": {
        "gem": { "strict": true }
      }
    }
  }
}
```

> [!NOTE]
> `language_servers` must be set per language, and Zed needs to be restarted after changing it.

## Other editors

Install ts-gem-lsp in the project and use it as the TypeScript language server, it must be started in the project root:

```bash
npm install -D ts-gem-lsp
```

```bash
npx ts-gem-lsp
```

Configuration is read from `initializationOptions.gem` and `workspace/didChangeConfiguration` `settings.gem`.

## CLI

```bash
npx ts-gem check
```

Positions are `<file:line:col>`, line and column start from 1:

```bash
npx ts-gem hover src/app.ts:10:8
```

| Command                                   | Description                                        |
| ----------------------------------------- | -------------------------------------------------- |
| `check [files...]`                        | TypeScript and Gem diagnostics, exit 1 on problems |
| `hover <file:line:col>`                   | Hover information                                  |
| `complete <file:line:col>`                | Completion                                         |
| `definition <file:line:col>`              | Go to definition                                   |
| `references <file:line:col>`              | Find references                                    |
| `highlight <file:line:col>`               | Document highlight                                 |
| `rename <file:line:col> <newName>`        | Rename                                             |
| `request <method> <file:line:col> [json]` | Send any request, `json` is merged into the params |

Add `--json` to print the raw LSP result.

## Configuration

Same as ts-gem-plugin:

```json
{
  // Some suggestions become warnings, for writing standard custom elements
  "strict": false,
  // Same as emmet configuration
  "emmet": {},
  // Let the language service know how to find the element definition
  "elementDefineRules": {
    "Duoyun*Element": "dy-*",
    "*Element": "*"
  }
}
```
