# Development

The following method is to improve the Gem development experience.

## Language Support

Install extension:
- [VSCode](https://marketplace.visualstudio.com/items?itemName=gem-vscode.vscode-plugin-gem)
- [Zed](https://zed.dev/extensions?query=gem)

## Formatting

### Prettier

`prettier` defaults to support the inline `html`/`css` template, but does not support`css({})`, use the following command to install `prettier`
To support the formatting of this style:

```sh
pnpm add -D prettier@npm:@mantou/prettier
```

### Biome

`biome` v2 defaults to support the inline `html`/`css` template, but does not support`css({})`.

## HMR

HMR is available through [unplugin-gem](./009-building.md) on webpack, Rspack, Vite and Rolldown (experimental).

### unplugin-gem (recommended)

Turn on `hot` in the bundler when it has a JS HMR host, then enable `hmr`. The plugin injects `@mantou/gem/helper/hmr` automatically:

```ts
unpluginGem({
  hmr: true,
});
```

Complete JavaScript HMR still needs a host that implements `import.meta.webpackHot` (webpack/Rspack) or `import.meta.hot` (Vite / experimental Rolldown). Rollup and esbuild only get the runtime so class updates stay compatible.

### SWC plugin

When using [swc-plugin-gem](./009-building.md) directly:
1. Turn on `hot` in the build tool, such as [Webpack](https://webpack.js.org/guides/hot-module-replacement)
2. Add `@mantou/gem/helper/hmr` to the bundler entry (it must run before any element class is defined)
3. Enable `hmr` in the SWC plugin config (`true` / `"webpack-hot"`, `"import-meta-hot"`, or `"module-hot"`)

### What HMR covers

Hot updated correctly:
- Bodies of methods, getters/setters and arrow function fields (including private and static members), such as templates, `@effect` and `@memo` contents and their dependencies, and the constructor body (applies to elements created afterwards)
- Adding or removing undecorated methods, getters/setters and arrow function fields (including private and static members)
- Adding or removing `@attribute`, `@property`, `@emitter`, `@state`, `@part` and `@slot` fields
- Styles (`@adoptedStyle`, `css`), including Light DOM
- Top-level constants and functions of the module
- State is kept: element instance fields and `createState`, and stores created by top-level `createStore`
- Creating elements with `new MyElement()` in updated code

Reloads the page:
- Adding or removing decorated methods or function fields (such as `@effect` and `@template`), or the constructor
- Adding or removing plain instance fields without decorators
- Changing `@shadow`, `@light({ penetrable })` or `@async`
- Adding or removing stores in `@connectStore`, or connecting a local store that is not created by top-level `createStore`
- A constructor with `super(args)`, `new.target`, TS parameter properties, or `return` with a value

Hot updated, but not guaranteed to be reliable:
- Apart from `@effect` and `@memo` dependencies, changed decorator arguments are not applied, such as `@template` conditions and `@aria`
- Changed field initial values and store initial values are not applied, because they are kept as state
- Other mutable top-level variables of the module (such as `let` variables or cache `Map`s) are reset when the module updates
- Changed static field values only apply when read through the class name inside the module; reading through `this.constructor` or `customElements.get()` still returns the old value
- Members with computed names are not hot updated
- Top-level side effects of the module run again, such as event listeners, timers and `render` in the entry
- DOM rendered by a changed template literal (`html`) is recreated, so input focus, child element state and similar state inside it are lost; unchanged templates reuse the existing DOM
- When a base class updates, new fields are only added to instances of the tag being updated
- Modules without element definitions (utilities, store modules) hand the update to the modules that import them; other modules outside that update chain keep the old version
