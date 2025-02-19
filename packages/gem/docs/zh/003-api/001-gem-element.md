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
| `@slot`          | 定义元素的 [`slot`][2]                                       |
| `@part`          | 定义元素的 [`part`][3]                                       |

> [!NOTE]
> 除 `@property` 外其他装饰器装饰的字段都有默认值，`@attribute`/`@boolattribute`/`@numattribute`/`@state`/`@slot`/`@part` 装饰的字段的值都将自动进行烤串式转换，在元素外部使用时请使用对应的烤串式值\_

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


## ~~生命周期钩子~~

| 名称           | 描述                                                            |
| -------------- | --------------------------------------------------------------- |
| `willMount`    | 挂载元素前的回调                                                |
| `render`       | 渲染元素，返回 `null` 时清空内容，返回 `undefined` 时不更新内容 |
| `mounted`      | 挂载元素后的回调                                                |
| `shouldUpdate` | 更新元素前的回调, 返回 `false` 时不更新元素                     |
| `updated`      | 更新元素后的回调                                                |
| `unmounted`    | 卸载元素后的回调                                                |

## 扩展方法

| 名称        | 描述                                   |
| ----------- | -------------------------------------- |
| `effect`    | 注册副作用，可以指定依赖               |
| `memo`      | 注册回调函数，可以指定依赖             |
| `update`    | 手动更新元素                           |
| `internals` | 获取元素的 [ElementInternals][12] 对象 |

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
> 通过 `import {} from '@mantou/gem/lib/reactive'` 可以导入无 lit-html 模板引擎的反应性元素，如果你的组件足够简单，使用这种方法将大幅减少构建尺寸。