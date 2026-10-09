# Gem for Zed

Improve the development experience of writing [Gem](https://github.com/mantou132/gem) elements.

The functionality provided is similar to [VSCode extension](https://marketplace.visualstudio.com/items?itemName=gem-vscode.vscode-plugin-gem).


## TypeScript 7

TypeScript 7 does not support tsserver plugins, the extension provides `ts-gem-lsp` to replace the TypeScript language server. Enable it in `.zed/settings.json` of TypeScript 7 projects, then restart Zed:

```json
{
  "languages": {
    "TypeScript": { "language_servers": ["ts-gem-lsp", "!vtsls", "!typescript-language-server", "..."] },
    "TSX": { "language_servers": ["ts-gem-lsp", "!vtsls", "!typescript-language-server", "..."] },
    "JavaScript": { "language_servers": ["ts-gem-lsp", "!vtsls", "!typescript-language-server", "..."] }
  }
}
```

See [ts-gem-lsp](../../packages/ts-gem-lsp) for details.
