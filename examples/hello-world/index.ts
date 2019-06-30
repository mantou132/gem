import { Component, createStore, updateStore, html } from '../../dist'
// 新建全局数据对象
const store = createStore({
  module1: {
    a: 1,
  },
})
// 创建组件
class App extends Component {
  static observedStore = [store.module1]
  clickHandle = () => {
    updateStore(store.module1, { a: ++store.module1.a })
  }
  render() {
    return html`
      <div @click="${this.clickHandle}">Hello, World</div>
      <div>store.module1.a: ${store.module1.a}</div>
    `
  }
}
// 定义成自定义元素
customElements.define('app-root', App)
// 插入 html
document.body.append(document.createElement('app-root'))
