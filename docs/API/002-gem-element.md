# GemElement

| 静态字段           | 描述                                                                |
| ------------------ | ------------------------------------------------------------------- |
| observedAttributes | 监听指定的 `attribute`, 当被监听的 `attribute` 变化时元素将自动更新 |
| observedPropertys  | 监听指定的 `property`, 当被监听的 `property` 变化时元素将自动更新   |
| observedStores     | 监听指定的 `Store`, 当被监听的 `Store` 变化时元素将自动更新         |
| adoptedStyleSheets | 同 `DocumentOrShadowRoot.adoptedStyleSheets`(注意兼容性)            |

| 生命周期         | 描述                                        |
| ---------------- | ------------------------------------------- |
| willMount        | 挂载元素前的回调                            |
| mounted          | 挂载元素后的回调                            |
| shouldUpdate     | 更新元素前的回调, 返回 `false` 时不更新元素 |
| updated          | 更新元素后的回调                            |
| attributeChanged | 更新元素 `attribute` 的回调                 |
| porpertyChanged  | 更新元素 `porperty` 的回调                  |
| unmounted        | 卸载元素后的回调                            |

| 只读方法 | 描述                                              |
| -------- | ------------------------------------------------- |
| setState | 使用 `Object.assign` 更新 `State`, 并自动触发更新 |
| update   | 重新调用 render 并更新元素                        |

| 其他   | 描述                                   |
| ------ | -------------------------------------- |
| render | 渲染元素                               |
| state  | 指定元素 `State`, 通过 `setState` 修改 |

## AsyncGemElement

和 `GemElement` 不同的是, `AsyncGemElement` 会使用 `requestAnimationFrame` 进行异步列队渲染, 不会阻塞主线程
