# Gem plugin for SWC

- auto import
- support [memo getter](https://github.com/tc39/proposal-decorators/issues/509#issuecomment-2226967170)
- support [top `&:hover`](https://github.com/w3c/csswg-drafts/issues/11000#issuecomment-2943322835) in shadow dom (expect only using `&` in selectors)
- support minify style
- resolve full path (for esm)
- support module level resource preload
- support hmr (experimental)

# Example

```json
{
  "$schema": "https://swc.rs/schema.json",
  "jsc": {
    "target": "es2024",
    "parser": { "syntax": "typescript", "decorators": true },
    "transform": { "decoratorVersion": "2022-03" },
    "experimental": {
      "runPluginFirst": true,
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
            "autoImportDts": true,
            "selectorCompatible": true,
            "styleMinify": true,
            "preload": true,
            "resolvePath": true,
            "hmr": true
          }
        ]
      ]
    }
  }
}
```

# Notes

- `memo getter` transform default enabled, only works when decorators are still in native decorator AST form:
  - use native decorators, or
  - ensure this plugin runs before decorator downlevel transform (e.g. enable `runPluginFirst: true` in the toolchain that supports it).
