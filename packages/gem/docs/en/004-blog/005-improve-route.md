# Optimized routing switching experience

The basic working form of the router when listening for URL changes to render matching components. When your project is large enough, we need to separate the code and load it on demand.
In general, it's a good idea to separate code by route.

## Problem

When switching routes, the current component is unloaded immediately, and the resources of the new component are loaded dynamically, and the component is rendered after loading, during which a white screen or a simple loader will be displayed.

## Optimization strategy

When switching routes, components are not unloaded immediately, but a progress bar for loading the new page is displayed. When the new page is ready, the old page is unloaded and the new page is mounted.
This way, we won't see a white screen and improve the user experience.

After adopting this strategy, two points need to be paid attention to:

1. The old page will not be unloaded immediately, when the URL changes, old pages may respond to URL changes by reading the wrong URL parameters
2. If the network speed is a bit slow, when switching routes multiple times in a row, it is necessary to ensure that the final correct page is rendered.
3. The scroll bar position should be reset after a new page is loaded. The scroll bar position should be restored after using the browser "Forward" and "Back".

## Read URL parameters

`GemRouteElement` has a `createLocationStore` method, which creates a [Store](../001-guide/001-basic/003-global-state-management.md) containing the URL parameters and then provides it to `<gem-route>` to get updates after a new page loads, for example:

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

## Restore scrollbar

`<gem-route>` can automatically restore the scrollbar position. It is called immediately after the route is rendered:

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
> Scroll based on `hash` requires additional logic, for example:
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
