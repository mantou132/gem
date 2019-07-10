# gem

创建自定义元素，绑定数据，路由切换，快速基于 WebComponents 开发 WebApp。
从 [mt-music-player](https://github.com/mantou132/mt-music-player) 中剥离出来。

## 开始

```js
import { GemElement, createStore, updateStore, html } from 'https://dev.jspm.io/@mantou/gem'

// 新建全局数据对象
const store = createStore({
  a: 1,
})

// 定义自定义元素
customElements.define(
  'app-root',
  class extends GemElement {
    static observedStores = [store]
    clickHandle = () => {
      updateStore(store, { a: ++store.a })
    }
    render() {
      return html`
        <button @click="${this.clickHandle}">Hello, World</button>
        <div>store.a: ${store.a}</div>
      `
    }
  },
)

// 插入 html
document.body.append(document.createElement('app-root'))
```

## API

### Store 相关

| API 名称       | 描述                                                          |
| -------------- | ------------------------------------------------------------- |
| createStore    | 创建一个 `Store`                                              |
| createStoreSet | 一次性创建多个 `Store`                                        |
| updateStore    | 使用 `Object.assign` 更新一个 `Store`                         |
| connect        | 将一个回调函数连接到 `Store`, 当 `Store` 更新时会异步进行调用 |
| disconnect     | 将一个回调函数从 `Store` 断开连接                             |

### GemElement

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
| unmounted        | 卸载元素后的回调                            |

| 只读方法         | 描述                                              |
| ---------------- | ------------------------------------------------- |
| setState         | 使用 `Object.assign` 更新 `State`, 并自动触发更新 |
| update           | 重新调用 render 并更新元素                        |
| disconnectStores | 断开元素监听的 `Store`                            |

| 其他   | 描述                              |
| ------ | --------------------------------- |
| render | 渲染元素                          |
| state  | 指定元素 `State`, 通过 `setState` |

### AsyncGemElement

和 `GemElement` 不同的是, 会使用 `requestAnimationFrame` 进行异步渲染, 不会阻塞主线程

### history

| 属性         | 描述                          |
| ------------ | ----------------------------- |
| historyState | 维护历史记录的 `Store`        |
| basePath     | 指定基本路径                  |
| forward      |                               |
| back         |                               |
| push         | 添加一条历史记录              |
| pushState    | 添加一条相同 URL 的历史记录   |
| replace      | 替换当前历史记录              |
| replaceState | 替换当前历史记录的非 URL 属性 |
