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

## Module entry points

Gem provides separate entry points so you can choose which layer to use:

| Import                                           | Includes                                                                                                                 |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `@mantou/gem/lib/reactive`                       | `GemElement` and reactive/style APIs without initializing the Lit template engine                                        |
| `@mantou/gem/lib/decorators`                     | Gem decorators; use with the reactive entry when you do not need template rendering                                      |
| `@mantou/gem/lib/element`                        | The element and decorator APIs, Lit-backed templates, directives, and `repeat`                                           |
| `@mantou/gem`                                    | The element entry point plus history, Store, and shared utilities                                                        |
| `@mantou/gem/elements/*`, `@mantou/gem/helper/*` | Optional built-in elements and helpers; see [Built-in elements](./005-built-in-element.md) and [Helper](./006-helper.md) |

Use `@mantou/gem/lib/element` or `@mantou/gem` for Lit-backed `html`/`svg` templates and directives. The reactive entry does not initialize the Lit template engine.

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
> All field decorators except `@property` provide a default value. Names defined by `@attribute`/`@boolattribute`/`@numattribute`/`@state`/`@slot`/`@part` are automatically converted to kebab-case; use the kebab-case names outside the element.

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


## Deprecated lifecycle compatibility

These lifecycle methods remain for backward compatibility, but are deprecated and may be removed. Do not use them in new elements; use decorators instead.

| Legacy method  | Use instead                                                                             |
| -------------- | --------------------------------------------------------------------------------------- |
| `willMount`    | `@willMount()`                                                                          |
| `render`       | `@template()`                                                                           |
| `shouldUpdate` | The condition argument to `@template((instance) => condition)`                          |
| `mounted`      | `@mounted()`                                                                            |
| `updated`      | `@effect()`; provide a dependency function when it should run only for specific changes |
| `unmounted`    | `@unmounted()` or a cleanup function returned from `@effect()`                          |

## Method

| name        | description                                         |
| ----------- | --------------------------------------------------- |
| `effect`    | Register side effects, you can specify dependencies |
| `memo`      | Register callback, you can specify dependencies     |
| `update`    | Update elements manually                            |
| `internals` | Get the element's [ElementInternals][12] object     |

[1]: https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals/states
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
> Import from `@mantou/gem/lib/reactive` when you do not need the Lit template engine. If a component needs Lit-backed templates, use `@mantou/gem/lib/element` instead.
