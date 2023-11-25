# 优化路由切换体验

监听 URL 的改变渲染匹配的组件是路由器的基本工作形式，当你的项目足够大时，我们需要进行代码分隔，然后按需加载，
一般情况下，按路由分隔代码是一种不错的方式。

## 问题

当切换路由时，当前组件被立即卸载，随即动态加载新组件的资源，加载好了再渲染组件，期间，将会显示白屏或者一个简单的加载器。

## 优化策略

切换路由时，不立刻卸载组件，而是显示新页面加载的进度条，当新页面已经准备就绪时，再卸载旧页面，挂载新页面，
这样，我们不会看到白屏，改善用户体验。

采用此种策略后，需要注意两点：

1. 旧页面不会立即卸载，当 URL 改变时，需要禁止旧页面根据 URL 进行更新
2. 如果网速稍慢，连续多次切换路由时，需要保证渲染最终正确的页面

## 使用 `<gem-route>`

`GemRouteElement` 有一个 `createLocationStore` 方法，他会创建一个包含 URL 参数的 [Store](../001-guide/001-basic/003-global-state-management.md)，然后将它提供给 `<gem-route>` 即可在新页面加载后获得更新，例如：

```ts
const locationStore = GemRouteElement.createLocationStore();

html`
  <gem-route
    .routes=${routes}
    .locationStore=${locationStore}
    @route-change=${onChange}
    @loading=${onLoading}
  ></gem-route>
`;
```

> [!TIP]
>
> `<gem-route>` 的 `route-change`, `loading` 事件允许你添加页面加载的进度条

在页面中从 `locationStore` 读取 URL 参数，防止未卸载的旧页面进行不必要的更新：

```ts
@customElement('my-element')
@connectStore(locationStore)
class MyElement extends GemElement {
  render = () => {
    return html`${locationStore.query}`;
  };
}
```

现在，你已经为你的应用路由切换提供了更好的用户体验。
