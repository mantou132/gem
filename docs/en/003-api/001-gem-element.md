---
navTitle: API
---

# GemElement

```ts
class GemElement<State> extends HTMLElement {
  constructor(options?: { isLight: boolean; isAsync: boolean }): GemElement;
  // ...
}
```

## Construction parameters

| name      | description                                |
| --------- | ------------------------------------------ |
| `isLight` | Whether to render as Light DOM             |
| `isAsync` | Whether to use non-blocking rendering mode |

_The [`delegatesFocus`](https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow) parameter is not supported temporarily, you can use [`:focus-within`](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-within)_

## Static properties

| name                 | description                                                                   |
| -------------------- | ----------------------------------------------------------------------------- |
| `observedAttributes` | Observe the specified `attribute`, re-rendered by `attribute` changes         |
| `observedPropertys`  | Observe the specified `property`, re-rendered by `property` changes           |
| `observedStores`     | Observe the specified `Store`, re-rendered by `Store` changes                 |
| `adoptedStyleSheets` | See [`DocumentOrShadowRoot.adoptedStyleSheets`][1]                            |
| `booleanAttributes`  | Mark the type of the specified `attribute` as `boolean`                       |
| `numberAttributes`   | Mark the type of the specified `attribute` as `number`                        |
| `defineEvents`       | Define events, execute trigger events                                         |
| `defineCSSStates`    | Define CSS State                                                              |
| `defineRefs`         | Define DOM reference, [see](../001-guide/002-advance/002-gem-element-more.md) |

[1]: https://developer.mozilla.org/en-US/docs/Web/API/DocumentOrShadowRoot/adoptedStyleSheets

_Please use [decorator](./007-decorator.md) in TypeScript_

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
