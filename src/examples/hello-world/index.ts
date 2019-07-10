import { GemElement, createStore, updateStore, html } from '../../'

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
