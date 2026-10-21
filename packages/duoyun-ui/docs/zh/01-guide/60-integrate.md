# 在 React 等项目中使用

[大多数前端框架/库](https://custom-elements-everywhere.com/)都能无缝使用自定义元素，比如分配 Attribute/Property，注册事件，
但是直接使用自定义元素没有[类型提示](https://code.visualstudio.com/docs/editor/intellisense)，所以 DuoyunUI 为 React/Vue/Svelte 分别导出了组件，
导入和使用方式在三个框架中保持一致：
- 从 `duoyun-ui/<react|vue|svelte>/<element>` 导入组件，例如 `import { DyInput } from 'duoyun-ui/react/input'`
- 事件使用 `on` + 驼峰事件名，例如 `onChange`（Vue 中为 `@change`）
- 组件 `ref` 可以调用元素的方法和 getter

导入后也可以直接使用自定义元素（例如 `<dy-input>`），同样具有类型提示。

## React

> [!NOTE]
> React 19 才支持自定义元素，请确保安装 React 19。

```tsx
import { useRef, useState } from 'react';
import { DyInput } from 'duoyun-ui/react/input';
import { DyColorPicker, type DyColorPickerExpose } from 'duoyun-ui/react/color-picker';

function Page() {
  const ref = useRef<DyColorPickerExpose>(null);
  const [value, setValue] = useState('');
  return (
    <>
      <DyInput value={value} clearable onChange={(evt) => setValue(evt.detail)}></DyInput>
      <DyColorPicker ref={ref}></DyColorPicker>
      <button onClick={() => ref.current?.showPicker()}>Pick</button>
    </>
  );
}
```

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

## Vue

```vue
<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { DyInput } from 'duoyun-ui/vue/input';
import { DyColorPicker } from 'duoyun-ui/vue/color-picker';

const value = ref('');
const picker = useTemplateRef('picker');
</script>

<template>
  <DyInput :value="value" clearable @change="(evt) => (value = evt.detail)"></DyInput>
  <DyColorPicker ref="picker"></DyColorPicker>
  <button @click="picker?.showPicker()">Pick</button>
</template>
```

如果要直接使用自定义元素，需要在 Vue 配置文件中指定：

```js
{
  compilerOptions: {
    isCustomElement: (tag) => tag.startsWith('dy-');
  }
}
```

## Svelte

```svelte
<script lang="ts">
  import { DyInput } from 'duoyun-ui/svelte/input';
  import { DyColorPicker } from 'duoyun-ui/svelte/color-picker';

  let value = $state('');
  let picker: ReturnType<typeof DyColorPicker> | undefined = $state();
</script>

<DyInput {value} clearable onChange={(evt) => (value = evt.detail)}></DyInput>
<DyColorPicker bind:this={picker}></DyColorPicker>
<button onclick={() => picker?.showPicker()}>Pick</button>
```

> [!NOTE]
> Svelte 组件实例只能导出函数，所以元素的 getter 需要以函数的形式调用，例如 `form.data()`。

> [!NOTE]
> 使用 `SvelteKit` 请确保 `svelte` 安装成 `dependencies` 而非 `devDependencies`，否则类型不能成功导入；
> 如果编译出现“Unexpected token 'export'”的错误请在 `vite.config.ts` 中添加下面代码：
>
> ```js
> {
>   ssr: {
>     noExternal: ['@mantou/gem', '@mantou/tap-ui', 'duoyun-ui'];
>   }
> }
> ```

## SSR

DuoyunUI 不支持 SSR，确切的说是 Next/Nuxt/Svelte 不支持自定义元素 SSR，自定义元素的 ShadowDOM 是运行时生成，
为了能在服务端正确运行，在前端代码的入口位置导入 `@mantou/gem/helper/ssr-shim`：
- Next.js: `pages/_app.tsx`
- SvelteKit: `src/hooks.server.ts`
- Nuxt.js: `plugins/ssr-shim.server.ts`

> [!NOTE]
> Nuxt 服务端构建会将 `window`、`document` 等全局变量替换成 `undefined`，需要在 `nuxt.config.ts` 中让它们读取 shim 设置的值：
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

如果要使用 DuoyunUI 的路由，可以使用 `<dy-light-route>`。为了避免首屏排版错误添加下面全局样式：

```css
:not(:defined) {
  display: none;
}
```
