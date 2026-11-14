# Used in projects like React

[Most frontend frameworks/libraries](https://custom-elements-everywhere.com/) can seamlessly use custom elements, such as assigning Attributes/Properties and registering events.
However, directly using custom elements lacks [type hints](https://code.visualstudio.com/docs/editor/intellisense), so TapUI exports components for React/Vue/Svelte,
with the same import and usage in all three frameworks:
- Import components from `@mantou/tap-ui/<react|vue|svelte>/<element>`, e.g. `import { TapInput } from '@mantou/tap-ui/react/input'`
- Events use `on` + camelCase event name, e.g. `onChange` (`@change` in Vue)
- The component `ref` can call the element's methods and getters

After importing, you can also use custom elements directly (e.g. `<tap-input>`) with type hints.

## React

> [!NOTE]
> React 19 supports custom elements. Please ensure you have React 19 installed.

```tsx
import { useRef, useState } from 'react';
import { TapInput } from '@mantou/tap-ui/react/input';
import { TapSwipeout, type TapSwipeoutExpose } from '@mantou/tap-ui/react/swipeout';

function Page() {
  const ref = useRef<TapSwipeoutExpose>(null);
  const [value, setValue] = useState('');
  return (
    <>
      <TapInput value={value} clearable onChange={(evt) => setValue(evt.detail)}></TapInput>
      <TapSwipeout ref={ref}>
        <button slot="end">Delete</button>
        <div>Item</div>
      </TapSwipeout>
      <button onClick={() => ref.current?.open()}>Open</button>
    </>
  );
}
```

### Using React Components in `<tap-route>`

`<tap-route>` only supports rendering `TemplateResult`:

```ts
const routes = {
  about: {
    pattern: '/about',
    title: `About`,
    getContent(_, ele) {
      return html`<p-about></p-about>`;
    },
  },
} satisfies RoutesObject;
```

To render React components, need to manually mount them to `<tap-route>`:

```ts
function renderReactNode(ele: any, node: ReactNode) {
  ele.react?.unmount();
  ele.react = createRoot(ele);
  ele.react.render(node);
}

const routes = {
  about: {
    pattern: '/about',
    title: `About`,
    getContent(_, ele) {
      renderReactNode(ele, <About />);
    },
  },
} satisfies RoutesObject;
```

## Vue

```vue
<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { TapInput } from '@mantou/tap-ui/vue/input';
import { TapSwipeout } from '@mantou/tap-ui/vue/swipeout';

const value = ref('');
const swipeout = useTemplateRef('swipeout');
</script>

<template>
  <TapInput :value="value" clearable @change="(evt) => (value = evt.detail)"></TapInput>
  <TapSwipeout ref="swipeout">
    <button slot="end">Delete</button>
    <div>Item</div>
  </TapSwipeout>
  <button @click="swipeout?.open()">Open</button>
</template>
```

To use custom elements directly, you need to specify them in the Vue configuration file:

```js
{
  compilerOptions: {
    isCustomElement: (tag) => tag.startsWith('tap-');
  }
}
```

## Svelte

```svelte
<script lang="ts">
  import { TapInput } from '@mantou/tap-ui/svelte/input';
  import { TapSwipeout } from '@mantou/tap-ui/svelte/swipeout';

  let value = $state('');
  let swipeout: ReturnType<typeof TapSwipeout> | undefined = $state();
</script>

<TapInput {value} clearable onChange={(evt) => (value = evt.detail)}></TapInput>
<TapSwipeout bind:this={swipeout}>
  <button slot="end">Delete</button>
  <div>Item</div>
</TapSwipeout>
<button onclick={() => swipeout?.open()}>Open</button>
```

> [!NOTE]
> Svelte component instances can only export functions, so element getters need to be called as functions, e.g. call `ref.data()` for a `data` getter.

> [!NOTE]
> When using `SvelteKit`, make sure `svelte` is installed as `dependencies` rather than `devDependencies`, otherwise types won't be imported successfully.
> If you encounter an "Unexpected token 'export'" error during compilation, add the following code to `vite.config.ts`:
>
> ```js
> {
>   ssr: {
>     noExternal: ['@mantou/gem', '@mantou/tap-ui'];
>   }
> }
> ```

## SSR

TapUI doesn't support SSR, or more precisely, Next/Nuxt/Svelte don't support custom element SSR. The ShadowDOM of custom elements is generated at runtime.
To make it work correctly on the server side, import `@mantou/gem/helper/ssr-shim` at the entry point of your frontend code:
- Next.js: `pages/_app.tsx`
- SvelteKit: `src/hooks.server.ts`
- Nuxt.js: `plugins/ssr-shim.server.ts`

> [!NOTE]
> Nuxt server builds replace globals such as `window` and `document` with `undefined`, so make them read the values set by the shim in `nuxt.config.ts`:
>
> ```js
> {
>   vite: {
>     $server: {
>       define: {
>         window: 'globalThis.window',
>         document: 'globalThis.document',
>         navigator: 'globalThis.navigator',
>         location: 'globalThis.location',
>       },
>     },
>   },
> }
> ```

If you want to use TapUI's routing, you can use `<tap-light-route>`. To avoid first-screen layout issues, add the following global style:

```css
:not(:defined) {
  display: none;
}
```
