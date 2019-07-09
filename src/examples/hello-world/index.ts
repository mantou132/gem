import { Component, createStore, updateStore, html } from '../../'
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
      <button @click="${this.clickHandle}">Hello, World</button>
      <div>store.a: ${store.a}</div>
    `
  }
}
// 定义成自定义元素
customElements.define('app-root', App)
// 插入 html
document.body.append(document.createElement('app-root'))
