# Decorator

In order to integrate TypeScript more conveniently, Gem has many built-in decorators for GemElement.

| 名称             | 描述                                                                       |
| ---------------- | -------------------------------------------------------------------------- |
| `@customElement` | Class decorator, define custom elements                                    |
| `@connectStore`  | Class decorator, bound to `Store`                                          |
| `@adoptedStyle`  | Class decorator, additional style sheet                                    |
| `@attribute`     | Field decorator, defining `string` type reactivity [`Attribute`][5]        |
| `@boolattribute` | Field decorator, defining `boolean` type reactivity [`Attribute`][5]       |
| `@numattribute`  | Field decorator, defining `number` type reactivity [`Attribute`][5]        |
| `@property`      | Field decorator, define reactivity [`Property`][6], no default value       |
| `@emitter`       | Field decorator, define event emitter, similar to [`HTMLElement.click`][4] |
| `@refobject`     | Field decorator, defining dom references                                   |
| `@state`         | Field decorator, define the inside of the element css [`state`][1]         |
| `@slot`          | Field decorator, [`slot`][2] that defines the element                      |
| `@part`          | Field decorator, [`part`][3] that defines the element                      |

[1]: https://github.com/w3c/webcomponents/blob/gh-pages/proposals/custom-states-and-state-pseudo-class.md
[2]: https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/slot
[3]: https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/part
[4]: https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/click
[5]: https://developer.mozilla.org/en-US/docs/Glossary/Attribute
[6]: https://developer.mozilla.org/en-US/docs/Glossary/property/JavaScript

_Fields using decorators (except `@property`) have default values_

Type with decorator

| name           | description                                   |
| -------------- | --------------------------------------------- |
| `RefObject<T>` | The type of the field defined by `@refobject` |
| `Emitter<T>`   | The type of the field defined by `@emitter`   |
