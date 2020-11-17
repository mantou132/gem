# 装饰器

为了更方便的集成 TypeScript，Gem 内置了许多用于 GemElement 的装饰器。

| 名称             | 描述                                                      |
| ---------------- | --------------------------------------------------------- |
| `@customElement` | 类装饰器，定义自定义元素                                  |
| `@connectStore`  | 类装饰器，绑定 `Store`                                    |
| `@adoptedStyle`  | 类装饰器，附加样式表                                      |
| `@attribute`     | 字段装饰器，定义 `string` 类型反应性 [`Attribute`][5]     |
| `@boolattribute` | 字段装饰器，定义 `boolean` 类型反应性 [`Attribute`]       |
| `@numattribute`  | 字段装饰器，定义 `number` 类型反应性 [`Attribute`]        |
| `@property`      | 字段装饰器，定义反应性 [`Property`][6]，无默认值          |
| `@emitter`       | 字段装饰器，定义事件发射器，类似 [`HTMLElement.click`][4] |
| `@refobject`     | 字段装饰器，定义元素引用                                  |
| `@state`         | 字段装饰器，定义元素内部 [`state`][1]                     |
| `@slot`          | 字段装饰器，定义元素的 [`slot`][2]                        |
| `@part`          | 字段装饰器，定义元素的 [`part`][3]                        |

[1]: https://github.com/w3c/webcomponents/blob/gh-pages/proposals/custom-states-and-state-pseudo-class.md
[2]: https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/slot
[3]: https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/part
[4]: https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/click
[5]: https://developer.mozilla.org/en-US/docs/Glossary/Attribute
[6]: https://developer.mozilla.org/en-US/docs/Glossary/property/JavaScript

_除 `@property` 外其他装饰器装饰的字段都有默认值，`@attribute`/`@boolattribute`/`@numattribute`/`@state`/`@slot`/`@part` 装饰的字段的值都将自动进行烤串式转换，在元素外部使用时请使用对应的烤串式值_

配合装饰器的 Type

| 名称           | 描述                          |
| -------------- | ----------------------------- |
| `RefObject<T>` | `@refobject` 定义的字段的类型 |
| `Emitter<T>`   | `@emitter` 定义的字段的类型   |
