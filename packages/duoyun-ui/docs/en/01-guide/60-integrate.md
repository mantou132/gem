# Used in projects like React

[Most frontend frameworks/libraries](https://custom-elements-everywhere.com/) can seamlessly use custom elements, such as assigning Attributes/Properties and registering events.
However, directly using custom elements lacks [type hints](https://code.visualstudio.com/docs/editor/intellisense) and ESLint support, so DuoyunUI has been re-exported to perfectly adapt to React/Vue/Svelte.

## React

> [!NOTE]
> React 19 supports custom elements. Please ensure you have React 19 installed.

Use DuoyunUI just like any other React component library:

<gbp-raw range="import DyCard,<DyCard-</DyCard>" src="https://raw.githubusercontent.com/mantou132/nextjs-learn/main/pages/ce-test.tsx"></gbp-raw>

### Using React Components in `<dy-route>`

`<dy-route>` only supports rendering `TemplateResult`:

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

To render React components, need to manually mount them to `<dy-route>`:

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

### Using React Components in Properties

Some elements support custom render content, such as the `header` of `<dy-card>`:

```ts
function Page() {
  return <DyCard header={html`<div>No.</div>`}></DyCard>;
}
```

If you want to render React components, you need to first render them to an `HTMLElement`. This can be achieved through a custom Hook:

```tsx
function useReactNode(node: ReactNode) {
  const ref = useRef<{ root: Root; container: HTMLElement }>();
  useEffect(() => () => ref.current?.root.unmount(), []);
  if (ref.current) {
    ref.current.root.render(node);
    return ref.current.container;
  }
  const container = document.createElement('div');
  container.style.display = 'contents';
  const root = createRoot(container);
  ref.current = { root, container };
  root.render(node);
  return container;
}

function Page() {
  return <DyCard header={useReactNode(<>No</>)}></DyCard>;
}
```

## Vue

DuoyunUI also exports Vue components. Usage is the same as React, with the only difference being that the path changes from `react` to `vue`.
Additionally, you need to specify custom elements in the Vue configuration file:

```js
{
  compilerOptions: {
    isCustomElement: (tag) => tag.startsWith('dy-');
  }
}
```

In Vue, you can also write custom elements directly, but you need to [distinguish](../02-elements/card.md) between Attributes and Properties:

<gbp-raw codelang="html" range="34-45" src="https://raw.githubusercontent.com/mantou132/nuxtjs-learn/main/pages/test.vue"></gbp-raw>

## Svelte

DuoyunUI hasn't been re-exported as Svelte components. You can use custom elements directly:

<gbp-raw codelang="html" range="2-9,44-55" src="https://raw.githubusercontent.com/mantou132/sveltekit-learn/main/src/routes/ce-test/+page.svelte"></gbp-raw>

> [!NOTE]
> When using `SvelteKit`, make sure `svelte` is installed as `dependencies` rather than `devDependencies`, otherwise types won't be imported successfully.
> If you encounter an "Unexpected token 'export'" error during compilation, add the following code to `vite.config.ts`:
>
> ```js
> {
>   ssr: {
>     noExternal: ['@mantou/gem', 'duoyun-ui'];
>   }
> }
> ```

## SSR

DuoyunUI doesn't support SSR, or more precisely, Next/Nuxt/Svelte don't support custom element SSR. The ShadowDOM of custom elements is generated at runtime.
To make it work correctly on the server side, import `@mantou/gem/helper/ssr-shim` at the entry point of your frontend code:

- Next.js: `pages/_app.tsx`
- Nuxt.js: `app.config.ts`
- SvelteKit: `src/hooks.server.ts`

If you want to use DuoyunUI's routing, you can use `<dy-light-route>`. To avoid first-screen layout issues, add the following global style:

```css
:not(:defined) {
  display: none;
}
```
