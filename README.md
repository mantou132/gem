# gem

创建组件，绑定数据，路由切换，快速基于 WebComponents 开发 WebApp。
从 [mt-music-player](https://github.com/mantou132/mt-music-player) 中剥离出来。

## 开始

```js
import { Component, createStore, updateStore, html } from 'https://dev.jspm.io/@mantou/gem'
// 新建全局数据对象
const store = createStore({
  a: 1,
})
// 创建组件
class App extends Component {
  static observedStores = [store]
  clickHandle = () => {
    updateStore(store, { a: ++store.a })
  }
  render() {
    return html`
      <div @click="${this.clickHandle}">Hello, World</div>
      <div>store.a: ${store.a}</div>
    `
  }
}
// 定义成自定义元素
customElements.define('app-root', App)
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

### Component

| 静态字段           | 描述                                                                |
| ------------------ | ------------------------------------------------------------------- |
| observedAttributes | 监听指定的 `attribute`, 当被监听的 `attribute` 变化时组件将自动更新 |
| observedPropertys  | 监听指定的 `property`, 当被监听的 `property` 变化时组件将自动更新   |
| observedStores     | 监听指定的 `Store`, 当被监听的 `property` 变化时组件将自动更新      |
| adoptedStyleSheets | 同 `DocumentOrShadowRoot.adoptedStyleSheets`                        |

| 生命周期         | 描述                                        |
| ---------------- | ------------------------------------------- |
| willMount        | 挂载组件前的回调                            |
| mounted          | 挂载组件后的回调                            |
| shouldUpdate     | 更新组件前的回调, 返回 `false` 时不更新组件 |
| updated          | 更新组件后的回调                            |
| attributeChanged | 更新组件 `attribute` 的回调                 |
| unmounted        | 卸载组件后的回调                            |

| 只读方法         | 描述                                              |
| ---------------- | ------------------------------------------------- |
| setState         | 使用 `Object.assign` 更新 `State`, 并自动触发更新 |
| update           | 重新调用 render 并更新组件                        |
| disconnectStores | 断开组件监听的 `Store`                            |

| 其他   | 描述                              |
| ------ | --------------------------------- |
| render | 渲染组件                          |
| state  | 指定组件 `State`, 通过 `setState` |

### AsyncComponent

类似 `Component`, 不过不会阻塞主线程

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
