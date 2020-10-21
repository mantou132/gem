---
isNav: true
navTitle: API
---

# GemElement

```ts
GemElement<State>
```

## Static properties

| name                 | description                                                           |
| -------------------- | --------------------------------------------------------------------- |
| `observedAttributes` | Observe the specified `attribute`, re-rendered by `attribute` changes |
| `observedPropertys`  | Observe the specified `property`, re-rendered by `property` changes   |
| `observedStores`     | Observe the specified `Store`, re-rendered by `Store` changes         |
| `adoptedStyleSheets` | See [`DocumentOrShadowRoot.adoptedStyleSheets`][1]                    |
| `booleanAttributes`  | Mark the type of the specified `attribute` as `boolean`               |
| `numberAttributes`   | Mark the type of the specified `attribute` as `number`                |

[1]: https://developer.mozilla.org/en-US/docs/Web/API/DocumentOrShadowRoot/adoptedStyleSheets

## Lifecycle hook

| name           | description                                                                               |
| -------------- | ----------------------------------------------------------------------------------------- |
| `willMount`    | Callback before mounting the element                                                      |
| `render`       | Render element                                                                            |
| `mounted`      | Callback after mounting the element                                                       |
| `shouldUpdate` | Callback before updating the element, do not re-render the element when returning `false` |
| `updated`      | Callback after updating the element                                                       |
| `unmounted`    | Callback after unloading the element                                                      |

## Other

| name               | description                                          |
| ------------------ | ---------------------------------------------------- |
| `effect`           | Register side effects, you can specify dependencies  |
| `update`           | Update elements manually                             |
| `state`/`setState` | Specify the element `State`, modify it by `setState` |
| `internals`        | Get the element's [ElementInternals][2] object       |

[2]: https://html.spec.whatwg.org/multipage/custom-elements.html#the-elementinternals-interface

## AsyncGemElement

```ts
AsyncGemElement<State>
```

Unlike `GemElement`, `AsyncGemElement` will use `requestAnimationFrame` for asynchronous queue rendering when necessary. will not block the main thread, [Live Demo](https://gem-examples.netlify.com/perf-demo/) (throttling the CPU to intuitively view the rendering method).

Its API is consistent with `GemElement`.
