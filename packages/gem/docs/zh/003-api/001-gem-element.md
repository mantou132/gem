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

## 模块导入入口

Gem 提供了不同的导入入口，可以按需选择使用层级：

| 导入路径                                         | 包含内容                                                                                             |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `@mantou/gem/lib/reactive`                       | `GemElement` 和响应式、样式 API，不会初始化 Lit 模板引擎                                             |
| `@mantou/gem/lib/decorators`                     | Gem 装饰器；不需要模板渲染时与响应式入口配合使用                                                     |
| `@mantou/gem/lib/element`                        | 元素和装饰器 API、Lit 模板、指令及 `repeat`                                                          |
| `@mantou/gem`                                    | 元素入口，以及 history、Store 和通用工具                                                             |
| `@mantou/gem/elements/*`、`@mantou/gem/helper/*` | 按需导入内置元素和辅助模块，见[内置 Gem 元素](./005-built-in-element.md)和 [Helper](./006-helper.md) |

需要使用 Lit 模板、指令时，请从 `@mantou/gem/lib/element` 或 `@mantou/gem` 导入。响应式入口不会初始化 Lit 模板引擎。

## 类装饰器

| 名称             | 描述                                                 |
| ---------------- | ---------------------------------------------------- |
| `@customElement` | 定义自定义元素标签                                   |
| `@connectStore`  | 绑定 `Store`，更新 `Store` 将自动更新元素            |
| `@adoptedStyle`  | 附加样式表到元素                                     |
| `@shadow`        | 使用 [ShadowDOM][10] 渲染内容                        |
| `@light`         | 使用 Light DOM 渲染内容，默认                        |
| `@async`         | 元素使用非阻塞渲染，适用于计算量大且有多个实例的元素 |
| `@aria`          | 指定富应用[可访问性][11]信息                         |

## 字段装饰器

| 名称             | 描述                                                         |
| ---------------- | ------------------------------------------------------------ |
| `@attribute`     | 定义 `string` 类型反应性 [`Attribute`][5]                    |
| `@boolattribute` | 定义 `boolean` 类型反应性 [`Attribute`][5]                   |
| `@numattribute`  | 定义 `number` 类型反应性 [`Attribute`][5]                    |
| `@property`      | 定义反应性 [`Property`][6]，无默认值                         |
| `@emitter`       | 定义事件发射器，类似 [`HTMLElement.click`][4]                |
| `@globalemitter` | 类似 `@emitter`, 自带 [`composed`][7] 和 [`bubbles`][8] 属性 |
| `@state`         | 定义元素 CSS [`state`][1]                                    |
| `@slot`          | 定义元素的 [`slot`][2]，可以定义成静态字段                   |
| `@part`          | 定义元素的 [`part`][3]，可以定义成静态字段                   |

> [!NOTE]
> 除 `@property` 外，其他字段装饰器都会提供默认值。`@attribute`/`@boolattribute`/`@numattribute`/`@state`/`@slot`/`@part` 对应的名称会自动转换为烤串式；在元素外部使用时请使用烤串式名称。

配合装饰器的 Type

| 名称         | 描述                        |
| ------------ | --------------------------- |
| `Emitter<T>` | `@emitter` 定义的字段的类型 |

## 方法/函数装饰器

| 名称         | 描述                                                 |
| ------------ | ---------------------------------------------------- |
| `@memo`      | 类似 `GemElement.memo`                               |
| `@effect`    | 类似 `GemElement.effect`                             |
| `@willMount` | 类似 `GemElement.willMount`                          |
| `@mounted`   | 类似 `GemElement.mounted`                            |
| `@unmounted` | 类似 `GemElement.unmounted`                          |
| `@template`  | 类似 `GemElement.render` + `GemElement.shouldUpdate` |
| `@fallback`  | 当内容渲染失败时渲染后备内容                         |


## 已弃用的生命周期兼容接口

这些生命周期方法仅为向后兼容而保留，已弃用且将来可能移除。新元素不要使用它们，应改用装饰器。

| 旧方法         | 替代方案                                            |
| -------------- | --------------------------------------------------- |
| `willMount`    | `@willMount()`                                      |
| `render`       | `@template()`                                       |
| `shouldUpdate` | `@template((instance) => condition)` 的条件参数     |
| `mounted`      | `@mounted()`                                        |
| `updated`      | `@effect()`；需要时传入依赖函数，仅在依赖变化时执行 |
| `unmounted`    | `@unmounted()`，或从 `@effect()` 返回清理函数       |

## 扩展方法

| 名称        | 描述                                   |
| ----------- | -------------------------------------- |
| `effect`    | 注册副作用，可以指定依赖               |
| `memo`      | 注册回调函数，可以指定依赖             |
| `update`    | 手动更新元素                           |
| `internals` | 获取元素的 [ElementInternals][12] 对象 |

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

## 工具函数

| 名称          | 描述                                        |
| ------------- | ------------------------------------------- |
| `createRef`   | 内部元素引用                                |
| `createState` | 为元素创建内部状态                          |
| `css`         | 使用构造函数创建能附加到元素的样式表        |
| `html`        | 模版字符串标签，用于创建 HTML lit-html 模版 |
| `svg`         | 模版字符串标签，用于创建 SVG lit-html 模版  |
| `render`      | 挂载 lit-html 模版到 DOM                    |
| `directive`   | 自定义 lit-html 模版渲染指令                |
| `repeat`      | 优化 lit-html 列表渲染指令                  |

> [!NOTE]
> 不需要 Lit 模板引擎时，可从 `@mantou/gem/lib/reactive` 导入响应式能力；需要 Lit 模板时请使用 `@mantou/gem/lib/element`。
