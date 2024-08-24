# 优化路由切换体验

监听 URL 的改变渲染匹配的组件是路由器的基本工作形式，当你的项目足够大时，我们需要进行代码分隔，然后按需加载，
一般情况下，按路由分隔代码是一种不错的方式。

## 问题

当切换路由时，当前页面被立即卸载，随即动态加载新页面的资源，加载好了再渲染页面，期间，将会显示白屏或者一个简单的加载器。
如果加载时间由于一些原因较慢，那么用户将长时间看不到有效内容从而造成焦虑。

## 优化策略

切换路由时，不立刻卸载组件，而是显示新页面加载的进度条，当新页面已经准备就绪时，再卸载旧页面，挂载新页面，
这样，我们不会看到白屏，改善用户体验。采用此种策略后，需要注意几点：

1. 旧页面不会立即卸载，当 URL 改变时，旧页面可能会响应 URL 的更改读取错误的 URL 参数
2. 如果网速稍慢，连续多次切换路由时，需要保证渲染最终正确的页面
3. 新页面加载后应该重置滚动条位置，当使用浏览器“前进”、“后退”后应该恢复滚动条位置

## 安全的获取 URL 参数

`GemRouteElement` 有一个 `createLocationStore` 静态方法，他会创建一个包含 URL 参数的 [Store](../001-guide/001-basic/003-global-state-management.md)，只需将它提供给 `<gem-route>` 即可从中安全的获取 URL 参数，例如：

```ts
const locationStore = GemRouteElement.createLocationStore();

html`
  <gem-route
    .routes=${routes}
    .locationStore=${locationStore}
    @routechange=${onRouteChange}
    @loading=${onLoading}
  ></gem-route>
`;

@customElement('page-about')
@connectStore(locationStore)
class PageAboutElement extends GemElement {
  render = () => {
    return html`${locationStore.query}`;
  };
}
```

## 恢复滚动条位置

`<gem-route>` 可以自动恢复滚动条位置，它在路由渲染完后立即调用，只需要为它指定滚动容器即可：

```ts 5
html`
  <gem-route
    .routes=${routes}
    .locationStore=${locationStore}
    .scrollContainer=${document.body}
    @routechange=${onRouteChange}
    @loading=${onLoading}
  ></gem-route>
`;
```

> [!NOTE]
> 根据 `hash` 跳转需要另外的逻辑，例如：
>
> ```ts
> @effect(() => [locationStore.hash])
> #updateScroll = ([hash]) => {
>   if (!hash) return;
>   this.shadowRoot
>     ?.querySelector(`[id="${hash.slice(1)}"]`)
>     ?.scrollIntoView({
>       block: 'start',
>     });
> }
> ```
