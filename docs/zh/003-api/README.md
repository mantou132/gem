---
isNav: true
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

| 名称      | 描述                   |
| --------- | ---------------------- |
| `isLight` | 是否渲染成 Light DOM   |
| `isAsync` | 是否使用非阻塞渲染模式 |

## 静态属性

| 名称                 | 描述                                                                |
| -------------------- | ------------------------------------------------------------------- |
| `observedAttributes` | 监听指定的 `attribute`, 当被监听的 `attribute` 变化时元素将重新渲染 |
| `observedPropertys`  | 监听指定的 `property`, 当被监听的 `property` 变化时元素将重新渲染   |
| `observedStores`     | 监听指定的 `Store`, 当被监听的 `Store` 变化时元素将重新渲染         |
| `adoptedStyleSheets` | 同 [`DocumentOrShadowRoot.adoptedStyleSheets`][1]                   |
| `booleanAttributes`  | 将指定的 `attribute` 的类型标记为 `boolean`                         |
| `numberAttributes`   | 将指定的 `attribute` 的类型标记为 `number`                          |

[1]: https://developer.mozilla.org/en-US/docs/Web/API/DocumentOrShadowRoot/adoptedStyleSheets

_在 TypeScript 中请使用[装饰器](./007-decorator)_

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