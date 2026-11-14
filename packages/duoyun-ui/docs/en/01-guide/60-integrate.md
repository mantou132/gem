# Used in projects like React

DuoyunUI is used in React/Vue/Svelte the same way as TapUI, see [TapUI Integration](https://tap-ui.gemjs.org/en/guide/integrate).
The differences are:
- Import components from `duoyun-ui/<react|vue|svelte>/<element>`, e.g. `import { DyInput } from 'duoyun-ui/react/input'`
- Use `<dy-route>` and `<dy-light-route>` for routing
- In Vue, specify custom elements with `isCustomElement: (tag) => tag.startsWith('dy-')`
- In SvelteKit, add `duoyun-ui` to `ssr.noExternal` as well:

```js
{
  ssr: {
    noExternal: ['@mantou/gem', '@mantou/tap-ui', 'duoyun-ui'];
  }
}
```
