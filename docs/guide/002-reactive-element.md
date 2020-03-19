# 响应式元素

当你想要创建一个响应式的 WebApp 时，
你需要你的元素对不同的数据做出反应（渲染）。

## 属性

响应式 attribute，使用标准的 [observedAttributes](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements#Using_the_lifecycle_callbacks)：

```js
class HelloWorld extends GemElement {
  static observedAttributes = ['name'];
}
```

当 `name` 属性更改时，`HelloWorld` 的实例元素将自动更新。

_注：`GemElement` 的 attribute 只支持 `string`，没有添加或者没有赋值时读取值都为空字符串_

类似 `observedAttributes`，GemElement 还支持 `observedPropertys` 和 `observedStores`，
他们分别响应 property 和 store（下一节将详细介绍） 的更改。

```js
const store = createStore({
  count: 0,
});

class HelloWorld extends GemElement {
  static observedStores = [store];
  static observedAttributes = ['name'];
  static observedPropertys = ['data'];

  clickHandle = () => {
    updateStore(store, { count: ++store.count });
  };
  render() {
    return html`
      <button @click="${this.clickHandle}">Hello, ${this.name}</button>
      <div>clicked clount: ${store.count}</div>
      <pre>${JSON.stringify(this.data)}</pre>
    `;
  }
}
```

[![Edit reactive-element](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/reactive-element-chu75?fontsize=14&hidenavigation=1&theme=dark)

当使用 TypeScript 时，可以在声明字段的同时使用装饰器进行响应式标记：

```ts
import { connectStore, GemElement, attribute, property } from '@mantou/gem';

@connectStore(storeA)
class HelloWorld extends GemElement {
  @attribute name: string;
  @property data: Data;
}
```

## 生命周期

```
                        +----------------------+
                        |attr/prop/store update|
                        +----------------------+
                                   |
                                   |
  +-------------+         +--------v-------+
  |  willMount  |         |  shouldUpdate  |
  +-------------+         +----------------+
         |                         |
         |                         |
  +---------------------------------------+
  |                render                 |
  +---------------------------------------+
         |                         |
         |                         |
  +------v------+            +-----v-----+
  |   mounted   |            |  updated  |
  +-------------+            +-----------+
         |                         |
         |<------------------------+
  +------v------+
  |  unmounted  |
  +-------------+
```
