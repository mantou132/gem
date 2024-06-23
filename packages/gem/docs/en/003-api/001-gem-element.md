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

| name             | description                                                               |
| ---------------- | ------------------------------------------------------------------------- |
| `isLight`        | Whether to render as Light DOM                                            |
| `isAsync`        | Whether to use non-blocking rendering mode                                |
| `focusable`      | Make elements focusable using `tabIndex`                                  |
| `delegatesFocus` | When the element attempts to focus, the automatic proxy to the focus part |
| `slotAssignment` | Allow manual allocation of slot                                           |

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
| `memo`             | Register callback, you can specify dependencies      |
| `update`           | Update elements manually                             |
| `state`/`setState` | Specify the element `State`, modify it by `setState` |
| `internals`        | Get the element's [ElementInternals][2] object       |

[2]: https://html.spec.whatwg.org/multipage/custom-elements.html#the-elementinternals-interface
