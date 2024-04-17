# Used in projects like React

[Most front-end frameworks/libraries](https://custom-elements-everywhere.com/) can seamlessly use custom elements, such as assigning Attribute/Property, registering events,
However, there is no [type hint](https://code.visualstudio.com/docs/editor/intellisense) when using custom elements directly, and ESLint is not supported, so DuoyunUI re-exported it and perfectly adapted to React/Vue/Svelte.

## React

> [!NOTE]
> Only the React 19 supports custom elements. Use `npm install react@canary react-dom@canary` to install the React 19.

Use DuoyunUI like any other React component library:

<gbp-raw range="import DyCard,<DyCard-</DyCard>" src="https://raw.githubusercontent.com/mantou132/nextjs-learn/main/pages/ce-test.tsx"></gbp-raw>

### Use React Component in `<dy-route>`

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

To render the React component, need to manually mount it onto the `<dy-route>`:

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

### Using the React component as Property

Some elements support custom rendering content, such as the `header` of `<dy-card>`:

```ts
function Page() {
  return <DyCard header={html`<div>No.</div>`}></DyCard>;
}
```

If want to render the React component, need to first mount it to the `HTMLElement`, which can be achieved through custom Hooks:

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

DuoyunUI also exports Vue components, which are used the same as React. The only difference is that the path is changed from `react` to `vue`,
in addition, custom elements need to be specified in the Vue configuration file:

```js
{
  compilerOptions: {
    isCustomElement: (tag) => tag.startsWith('dy-');
  }
}
```

In the Vue project, it also supports directly writing custom elements, but [distinguish](../02-elements/card.md) is it Attribute or Property:

<gbp-raw codelang="html" range="34-45" src="https://raw.githubusercontent.com/mantou132/nuxtjs-learn/main/pages/test.vue"></gbp-raw>

## Svelte

DuoyunUI does not re-export as a Svelte component, and you can use the custom element directly:

<gbp-raw codelang="html" range="2-9,44-55" src="https://raw.githubusercontent.com/mantou132/sveltekit-learn/main/src/routes/ce-test/+page.svelte"></gbp-raw>

> [!NOTE]
> Use the `Sveltekit`, please make sure the `Svelte` is installed as a `dependencies` instead of `DevDependenCies`, otherwise the type cannot be import successfully;
> if you compile the error of "Unexpected token 'export'", please add the following code to `vite.config.ts`:
>
> ```js
> {
>   ssr: {
>     noExternal: ['@mantou/gem', 'duoyun-ui'];
>   }
> }
> ```

## SSR

DuoyunUI does not support SSR, to be precise, Next/Nuxt/Svelte do not support SSR for custom elements. The ShadowDOM of custom elements is generated at runtime. To ensure proper server-side rendering, import `@mantou/gem/helper/ssr-shim` at the entry point of your front-end code.

- Next.js: `pages/_app.tsx`
- Nuxt.js: `app.config.ts`
- SvelteKit: `src/hooks.server.ts`

If you want to use DuoyunUI routing, you can use `<dy-light-route>`. To avoid layout issues on the initial page load, add the following global styles:

```css
:not(:defined) {
  display: none;
}
```
