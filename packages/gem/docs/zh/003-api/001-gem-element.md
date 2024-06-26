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

## 构造参数

| 名称             | 描述                                 |
| ---------------- | ------------------------------------ |
| `isLight`        | 是否渲染成 Light DOM                 |
| `isAsync`        | 是否使用非阻塞渲染模式               |
| `focusable`      | 使用 `tabIndex` 让元素可聚焦         |
| `delegatesFocus` | 当元素尝试聚焦时自动代理到可聚焦部分 |
| `slotAssignment` | 允许手动分配插槽                     |

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
| `memo`             | 注册回调函数，可以指定依赖                             |
| `update`           | 手动更新元素                                           |
| `state`/`setState` | 指定元素 `State`, 通过 `setState` 修改，修改后触发更新 |
| `internals`        | 获取元素的 [ElementInternals][2] 对象                  |

[2]: https://html.spec.whatwg.org/multipage/custom-elements.html#the-elementinternals-interface
