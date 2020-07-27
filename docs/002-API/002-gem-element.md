# GemElement

## 静态属性

| 名称                 | 描述                                                                |
| -------------------- | ------------------------------------------------------------------- |
| `observedAttributes` | 监听指定的 `attribute`, 当被监听的 `attribute` 变化时元素将自动更新 |
| `booleanAttributes`  | 指定 Attribute 的类型为 `boolean`                                   |
| `numberAttributes`   | 指定 Attribute 的类型为 `number`                                    |
| `observedPropertys`  | 监听指定的 `property`, 当被监听的 `property` 变化时元素将自动更新   |
| `observedStores`     | 监听指定的 `Store`, 当被监听的 `Store` 变化时元素将自动更新         |
| `adoptedStyleSheets` | 同 [`DocumentOrShadowRoot.adoptedStyleSheets`][1]                   |

[1]: https://developer.mozilla.org/en-US/docs/Web/API/DocumentOrShadowRoot/adoptedStyleSheets

## 生命周期钩子

| 名称           | 描述                                        |
| -------------- | ------------------------------------------- |
| `willMount`    | 挂载元素前的回调                            |
| `render`       | 渲染元素                                    |
| `mounted`      | 挂载元素后的回调                            |
| `shouldUpdate` | 更新元素前的回调, 返回 `false` 时不更新元素 |
| `updated`      | 更新元素后的回调                            |
| `unmounted`    | 卸载元素后的回调                            |

## 其他

| 名称               | 描述                                                   |
| ------------------ | ------------------------------------------------------ |
| `effect`           | 注册副作用，可以指定依赖                               |
| `update`           | 手动更新元素                                           |
| `state`/`setState` | 指定元素 `State`, 通过 `setState` 修改，修改后触发更新 |
| `internals`        | 获取元素的 [ElementInternals][2] 对象                  |

[2]: https://html.spec.whatwg.org/multipage/custom-elements.html#the-elementinternals-interface

## AsyncGemElement

和 `GemElement` 不同的是, `AsyncGemElement` 在必要情况下会使用 `requestAnimationFrame` 进行异步列队渲染,
不会阻塞主线程，[Live Demo](https://gem-examples.netlify.com/perf-demo/)（将 CPU 节流以直观的查看渲染方式）。

但他的 API 和 `GemElement` 保持一致。
