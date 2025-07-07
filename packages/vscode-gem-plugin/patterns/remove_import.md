# Remove unnecessary import

When using the auto import of [`swc-plugin-gem`](https://www.npmjs.com/package/swc-plugin-gem), you can clear some imports to keep your code clean.

```grit
engine marzano(0.1)
language js

or {
  `import $import_clause from "@mantou/gem/elements/$name"` where {
    $import_clause <: not contains `$_`
  } => .,

  `import $import_clause from "duoyun-ui/elements/$name"` where {
    $import_clause <: not contains `$_`
  } => .,

  `import { $named_imports } from "@mantou/gem"` where {
    $named_imports <: maybe some bubble or {
      `type $import`,
      `$import`
    } where {
      $import <: or {
        // crates/swc-plugin-gem/src/auto-import.json
        `GemElement`,
        `TemplateResult`,
        `css`,
        `html`,
        `mathml`,
        `svg`,

        `aria`,
        `async`,
        `shadow`,
        `light`,
        `adoptedStyle`,
        `connectStore`,
        `customElement`,

        `part`,
        `slot`,

        `attribute`,
        `numattribute`,
        `boolattribute`,
        `property`,
        `emitter`,
        `globalemitter`,
        `state`,

        `effect`,
        `memo`,
        `willMount`,
        `mounted`,
        `unmounted`,
        `template`,
        `fallback`,

        `createRef`,
        `createState`,
        `createStore`,

        `raw`,
        `styled`,
        `styleMap`,
        `classMap`,
        `partMap`,
        `exportPartsMap`,
      },
      $import => .,
    }
  },

  `import {} from "@mantou/gem"` => .,
}
```

## Test case: element import

```js
import { GemLinkElement } from "@mantou/gem/elements/link";
import "@mantou/gem/elements/link";

html`<gem-link></gem-link>`;
```

```js
import { GemLinkElement } from "@mantou/gem/elements/link";

html`<gem-link></gem-link>`
```

## Test case: member import

```js
import { html, css, xx } from "@mantou/gem";
```

```js
import { xx } from "@mantou/gem";
```