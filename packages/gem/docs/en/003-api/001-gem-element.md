---
navTitle: API
---

# GemElement

```ts
class GemElement extends HTMLElement {
  constructor(): GemElement;
  // ...
}
```

## Class Decorator

| name             | description                                                              |
| ---------------- | ------------------------------------------------------------------------ |
| `@customElement` | Class decorator, define custom elements tag                              |
| `@connectStore`  | Class decorator, bound to `Store`, element auto update by `Store` update |
| `@adoptedStyle`  | Class decorator, adopt style sheet                                       |
| `@shadow`        | Class decorator, Use [ShadowDOM][10] render content                      |
| `@light`         | Class decorator, Use light dom render content, default                   |
| `@async`         | Class decorator, Use no blocking render                                  |
| `@aria`          | Class decorator, Specify the [accessibility][11] info                    |

## Field Decorator

| name             | description                                                                  |
| ---------------- | ---------------------------------------------------------------------------- |
| `@attribute`     | Field decorator, defining `string` type reactivity [`Attribute`][5]          |
| `@boolattribute` | Field decorator, defining `boolean` type reactivity [`Attribute`][5]         |
| `@numattribute`  | Field decorator, defining `number` type reactivity [`Attribute`][5]          |
| `@property`      | Field decorator, define reactivity [`Property`][6], no default value         |
| `@emitter`       | Field decorator, define event emitter, similar to [`HTMLElement.click`][4]   |
| `@globalemitter` | Similar `@emitter`, comes with [`composed`][7] and [`bubbles`][8] attributes |
| `@state`         | Field decorator, define the inside of the element css [`state`][1]           |
| `@slot`          | Field(static or instance) decorator, [`slot`][2] that defines the element    |
| `@part`          | Field(static or instance) decorator, [`part`][3] that defines the element    |

> [!NOTE]
> Except for `@property`, all fields decorated by decorators have default values, `@attribute`/`@boolattribute`/`@numattribute`/`@state`/`@slot`/`@part` the value of the decorated field will be automatically converted to kebab-case. Please use the kebab-case value when you use it outside the element outside

Type with decorator

| name         | description                                 |
| ------------ | ------------------------------------------- |
| `Emitter<T>` | The type of the field defined by `@emitter` |

## Method Decorator

| name         | description                                                  |
| ------------ | ------------------------------------------------------------ |
| `@memo`      | Similar `GemElement.memo`                                    |
| `@effect`    | Similar `GemElement.effect`                                  |
| `@willMount` | Similar `GemElement.willMount`                               |
| `@mounted`   | Similar `GemElement.mounted`                                 |
| `@unmounted` | Similar `GemElement.unmounted`                               |
| `@template`  | Similar `GemElement.render` + `GemElement.shouldUpdate`      |
| `@fallback`  | When the content render error, rendering the reserve content |


## ~~Lifecycle hook~~

| name           | description                                                                                                 |
| -------------- | ----------------------------------------------------------------------------------------------------------- |
| `willMount`    | Callback before mounting the element                                                                        |
| `render`       | Render element, clear the content when return `null`, and do not update the content when return `undefined` |
| `mounted`      | Callback after mounting the element                                                                         |
| `shouldUpdate` | Callback before updating the element, do not re-render the element when returning `false`                   |
| `updated`      | Callback after updating the element                                                                         |
| `unmounted`    | Callback after unloading the element                                                                        |

## Method

| name        | description                                         |
| ----------- | --------------------------------------------------- |
| `effect`    | Register side effects, you can specify dependencies |
| `memo`      | Register callback, you can specify dependencies     |
| `update`    | Update elements manually                            |
| `internals` | Get the element's [ElementInternals][12] object     |

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

## Utils

| name          | description                                                                     |
| ------------- | ------------------------------------------------------------------------------- |
| `createRef`   | Defining dom references                                                         |
| `createState` | Specify the element internal state                                              |
| `css`         | Use the constructor to create a style sheet that can be attached to the element |
| `html`        | Template string tags, used to create HTML lit-html templates                    |
| `svg`         | Template string tags, used to create SVG lit-html templates                     |
| `render`      | Mount lit-html template to DOM                                                  |
| `directive`   | Custom lit-html template rendering directive                                    |
| `repeat`      | Optimize lit-html list rendering directive                                      |

> [!NOTE]
> You can import reactive elements without the lit-html template engine by using `import {} from '@mantou/gem/lib/reactive'`. If your component is simple enough, using this method will significantly reduce the build size.