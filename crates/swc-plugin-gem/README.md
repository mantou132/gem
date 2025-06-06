# Gem plugin for SWC

- auto import
- support [memo getter](https://github.com/tc39/proposal-decorators/issues/509#issuecomment-2226967170)
- support [top `&:hover`](https://github.com/w3c/csswg-drafts/issues/11000#issuecomment-2943322835) in shadow dom
- support minify style
- resolve full path (for esm)

# Example

```json
{
  "$schema": "https://swc.rs/schema.json",
  "jsc": {
    "target": "es2024",
    "parser": { "syntax": "typescript" },
    "experimental": {
      "plugins": [
        [
          "swc-plugin-gem",
          {
            "autoImport": {
              "extends": "gem",
              "members": {
                "test": ["test"]
              }
            },
            "autoImportDts": true
          }
        ]
      ]
    }
  }
}
```
