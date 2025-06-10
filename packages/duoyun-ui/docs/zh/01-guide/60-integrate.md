# 在 React 等项目中使用

[大多数前端框架/库](https://custom-elements-everywhere.com/)都能无缝使用自定义元素，比如分配 Attribute/Property，注册事件，
但是直接使用自定义元素没有[类型提示](https://code.visualstudio.com/docs/editor/intellisense)，所以 DuoyunUI 进行了重导出，完美适配了 React/Vue/Svelte。

## React

> [!NOTE]
> React 19 才支持自定义元素，请确保安装 React 19。

跟使用其他 React 组件库一样使用 DuoyunUI：

<gbp-raw range="import DyCard,<DyCard-</DyCard>" src="https://raw.githubusercontent.com/mantou132/nextjs-learn/main/pages/ce-test.tsx"></gbp-raw>

### 在 `<dy-route>` 中使用 React 组件

`<dy-route>` 只支持渲染 `TemplateResult`：

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

要渲染 React 组件需要手动挂载到 `<dy-route>` 上:

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

### 在 Property 上使用 React 组件

一些元素支持自定义渲染内容，例如 `<dy-card>` 的 `header`：

```ts
function Page() {
  return <DyCard header={html`<div>No.</div>`}></DyCard>;
}
```

如果要渲染 React 组件，则需要先渲染到 `HTMLElement` 上，可以通过自定义 Hooks 实现：

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

DuoyunUI 也导出了 Vue 组件，使用和 React 一样，唯一的区别是路径将 `react` 改成 `vue`，
另外需要在 Vue 配置文件中指定自定义元素：

```js
{
  compilerOptions: {
    isCustomElement: (tag) => tag.startsWith('dy-');
  }
}
```

在 Vue 中也支持直接写自定义元素，但是要[区分](../02-elements/card.md#api)是 Attribute 还是 Property：

<gbp-raw codelang="html" range="34-45" src="https://raw.githubusercontent.com/mantou132/nuxtjs-learn/main/pages/test.vue"></gbp-raw>

## Svelte

DuoyunUI 没有重导出为 Svelte 组件，直接使用自定义元素即可：

<gbp-raw codelang="html" range="2-9,44-55" src="https://raw.githubusercontent.com/mantou132/sveltekit-learn/main/src/routes/ce-test/+page.svelte"></gbp-raw>

> [!NOTE]
> 使用 `SvelteKit` 请确保 `svelte` 安装成 `dependencies` 而非 `devDependencies`，否则类型不能成功导入；
> 如果编译出现“Unexpected token 'export'”的错误请在 `vite.config.ts` 中添加下面代码：
>
> ```js
> {
>   ssr: {
>     noExternal: ['@mantou/gem', 'duoyun-ui'];
>   }
> }
> ```

## SSR

DuoyunUI 不支持 SSR，确切的说是 Next/Nuxt/Svelte 不支持自定义元素 SSR，自定义元素的 ShadowDOM 是运行时生成，
为了能在服务端正确运行，在前端代码的入口位置导入 `@mantou/gem/helper/ssr-shim`：

- Next.js: `pages/_app.tsx`
- Nuxt.js: `app.config.ts`
- SvelteKit: `src/hooks.server.ts`

如果要使用 DuoyunUI 的路由，可以使用 `<dy-light-route>`。为了避免首屏排版错误添加下面全局样式：

```css
:not(:defined) {
  display: none;
}
```
