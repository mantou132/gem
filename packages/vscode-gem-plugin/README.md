# Gem for VSCode

Improve the development experience of writing [Gem](https://github.com/mantou132/gem) elements:

- Inline HTML/CSS/Style support
  - Basic functional support, just like developing in `.html`/`.css` files
  - Custom element support
    - Go to Definition
    - Go to References
    - Rename element tag
    - Element tag/attr/prop validate
    - Hover document
    - Auto complete
- Gem API support
  - `@effect`/`@memo` allow unused private field
  - [State](https://gemjs.org/en/guide/basic/reactive-element) property suggestion remove irrelevant content

## Configure

```json
{
  // Let the extension know how to find the element definition
  "gem.elementDefineRules": {
    "Duoyun*Element": "dy-*",
    "*Element": "*",
  },
  // Same as emmet configuration
  "gem.emmet": {},
}
```

## TypeScript 7

When the [TypeScript 7 extension](https://marketplace.visualstudio.com/items?itemName=TypeScriptTeam.native-preview) is installed, the extension adds Gem features to it through [ts-gem-lsp](https://github.com/mantou132/gem/tree/main/packages/ts-gem-lsp), no extra configuration is needed.

## Special Thanks

- [vscode-inline-html](https://github.com/pushqrdx/vscode-inline-html)
- [lit-analyzer](https://github.com/runem/lit-analyzer)