---
navTitle: API
---

# GemElement

```ts
class GemElement<State> extends HTMLElement {
  constructor(): GemElement;
  // ...
}
```

## Decorator

| name             | description                                                                  |
| ---------------- | ---------------------------------------------------------------------------- |
| `@customElement` | Class decorator, define custom elements                                      |
| `@connectStore`  | Class decorator, bound to `Store`                                            |
| `@adoptedStyle`  | Class decorator, additional style sheet                                      |
| `@shadow`        | Class decorator, Use [ShadowDOM][10]                                         |
| `@async`         | Class decorator, Use no blocking render                                      |
| `@aria`          | Class decorator, Specify the [accessibility][11] info                        |
| `@attribute`     | Field decorator, defining `string` type reactivity [`Attribute`][5]          |
| `@boolattribute` | Field decorator, defining `boolean` type reactivity [`Attribute`][5]         |
| `@numattribute`  | Field decorator, defining `number` type reactivity [`Attribute`][5]          |
| `@property`      | Field decorator, define reactivity [`Property`][6], no default value         |
| `@emitter`       | Field decorator, define event emitter, similar to [`HTMLElement.click`][4]   |
| `@globalemitter` | Similar `@emitter`, comes with [`composed`][7] and [`bubbles`][8] attributes |
| `@refobject`     | Field decorator, defining dom references                                     |
| `@state`         | Field decorator, define the inside of the element css [`state`][1]           |
| `@slot`          | Field decorator, [`slot`][2] that defines the element                        |
| `@part`          | Field decorator, [`part`][3] that defines the element                        |

> [!NOTE]
> Except for `@property`, all fields decorated by decorators have default values, `@attribute`/`@boolattribute`/`@numattribute`/`@state`/`@slot`/`@part` the value of the decorated field will be automatically converted to kebab-case. Please use the kebab-case value when you use it outside the element outside

Type with decorator

| name           | description                                   |
| -------------- | --------------------------------------------- |
| `RefObject<T>` | The type of the field defined by `@refobject` |
| `Emitter<T>`   | The type of the field defined by `@emitter`   |

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
| `internals`        | Get the element's [ElementInternals][12] object      |

[1]: https://github.com/w3c/webcomponents/blob/gh-pages/proposals/custom-states-and-state-pseudo-class.md
[2]: https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/slot
[3]: https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/part
[4]: https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/click
[5]: https://developer.mozilla.org/en-US/docs/Glossary/Attribute
[6]: https://developer.mozilla.org/en-US/docs/Glossary/property/JavaScript
[7]: https://developer.mozilla.org/en-US/docs/Web/API/Event/composed
[8]: https://developer.mozilla.org/en-US/docs/Web/API/Event/bubbles
[10]: https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM
[11]: https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals#instance_properties_included_from_aria
[12]: https://html.spec.whatwg.org/multipage/custom-elements.html#the-elementinternals-interface
