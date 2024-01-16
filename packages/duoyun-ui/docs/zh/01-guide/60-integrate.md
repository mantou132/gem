# 在 React 等项目中使用

[大多数前端框架/库](https://custom-elements-everywhere.com/)都能无缝使用自定义元素，比如分配 Attribute/Property，注册事件，
但是直接使用自定义元素没有[类型提示](https://code.visualstudio.com/docs/editor/intellisense)、不支持 ESLint，所以 DuoyunUI 进行了重导出，完美适配了 React/Vue/Svelte。

## React

> [!NOTE]
> React 的实验版才支持自定义元素，使用 `npm install react@experimental react-dom@experimental` 安装 React 实验版。

跟使用其他 React 组件库一样使用 DuoyunUI：

<gbp-raw range="import DyCard,<DyCard-</DyCard>" src="https://raw.githubusercontent.com/mantou132/nextjs-learn/main/pages/ce-test.tsx"></gbp-raw>

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

<gbp-raw codelang="html" range="2-9,46-57" src="https://raw.githubusercontent.com/mantou132/sveltekit-learn/main/src/routes/ce-test/+page.svelte"></gbp-raw>

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
