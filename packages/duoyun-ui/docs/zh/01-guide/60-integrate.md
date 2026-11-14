# 在 React 等项目中使用

在 React/Vue/Svelte 中使用 DuoyunUI 的方式与 TapUI 相同，参考 [TapUI 集成](https://tap-ui.gemjs.org/zh/guide/integrate)。
不同之处在于：
- 从 `duoyun-ui/<react|vue|svelte>/<element>` 导入组件，例如 `import { DyInput } from 'duoyun-ui/react/input'`
- 使用 `<dy-route>` 和 `<dy-light-route>` 进行路由
- 在 Vue 中使用 `isCustomElement: (tag) => tag.startsWith('dy-')` 指定自定义元素
- 在 SvelteKit 中，`ssr.noExternal` 还需要添加 `duoyun-ui`：

```js
{
  ssr: {
    noExternal: ['@mantou/gem', '@mantou/tap-ui', 'duoyun-ui'];
  }
}
```
