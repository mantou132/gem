# 响应式元素

当你想要创建一个响应式的 WebApp 时，
你需要你的元素对不同的输入（Attribute/Property/Store）做出响应（重新渲染）。
原生 DOM API 就有 Attribute/Property 的概念，
为了区分普通和能够响应数据更改的 Attribute/Property，
所以响应式的 Attribute/Property/Store 需要通过“Observe”指定。

## 定义

定义具备响应性的 Attribute，使用标准的 [observedAttributes](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements#Using_the_lifecycle_callbacks) 静态属性：

```js
class HelloWorld extends GemElement {
  static observedAttributes = ['first-name'];
  render() {
    // “Observed” 的 attribute 能直接通过 Property 进行访问
    // 且会自动进行驼峰和烤串格式的转换
    return html`
      ${this.firestName}
    `;
  }
}
```

当 `first-name` 属性更改时，`HelloWorld` 的实例元素将自动更新。

_注：`GemElement` 的 attribute 只支持 `string`，没有添加或者没有赋值时读取值都为空字符串_

类似 `observedAttributes`，GemElement 还支持 `observedPropertys`/`observedStores` 用来响应指定的 Property/Store：

```js
class HelloWorld extends GemElement {
  static observedPropertys = ['data'];
  static observedStores = [store];
}
```

另外 `GemElement` 提供了类似 React 的 `state`/`setState` 用来处理元素自身的状态，
每当调用 `setState` 时将触发元素更新：

```js
class HelloWorld extends GemElement {
  state: { a: 1 };
  clicked() {
    this.setState({ a: 2 });
  }
}
```

## 例子

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

## 使用 TypeScript

当使用 TypeScript 时，可以在声明字段的同时使用装饰器进行响应式声明：

```ts
import { connectStore, GemElement, attribute, property } from '@mantou/gem';

const store = createStore({
  count: 0,
});

@connectStore(store)
class HelloWorld extends GemElement {
  @attribute name: string;
  @property data: Data | undefined;
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
  +------v-------------------------v------+
  |                render                 |
  +---------------------------------------+
         |                         |
         |                         |
  +------v------+           +------v------+
  |   mounted   |           |   updated   |
  +-------------+           +-------------+
         |                         |
         |                         |
  +------v-------------------------v------+
  |               unmounted               |
  +---------------------------------------+
```
