# 反应性元素

当你想要创建一个反应性的 WebApp 时，
你需要元素能对不同的输入（attribute/property/store）做出反应（重新渲染）。

## 定义

定义具备反应性的 attribute，使用标准的 [observedAttributes](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements#Using_the_lifecycle_callbacks) 静态属性：

```js
class HelloWorld extends GemElement {
  static observedAttributes = ['first-name'];
  render() {
    return html`
      ${this.firestName}
    `;
  }
}
```

当 `first-name` 属性经过“Observed”，他能直接通过 property 进行访问，
且会自动进行驼峰和烤串格式的转换，
当数据更改时，`HelloWorld` 的实例元素将自动更新。

类似 `observedAttributes`，GemElement 还支持 `observedPropertys`/`observedStores` 用来反应指定的 property/store：

```js
class HelloWorld extends GemElement {
  static observedPropertys = ['data'];
  static observedStores = [store];
}
```

_不要在元素 `constructor` 以外的地方修改 prop/attr，他们应该由父元素单向传递进来_

另外 `GemElement` 提供了类似 React 的 `state`/`setState` 用来处理元素自身的状态，
每当调用 `setState` 时将触发元素更新：

```js
class HelloWorld extends GemElement {
  state = { a: 1 };
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

当使用 TypeScript 时，可以在声明字段的同时使用装饰器进行反应性声明：

```ts
import { GemElement } from '@mantou/gem';
import { connectStore, attribute, property } from '@mantou/gem';

const store = createStore({
  count: 0,
});

@connectStore(store)
class HelloWorld extends GemElement {
  @attribute name: string;
  @boolattribute disabled: boolean;
  @numattribute count: number;
  @property data: Data | undefined;
}
```

## 生命周期

```
  +-------------+       +----------------------+
  |  construct  |       |attr/prop/store update|
  +-------------+       +----------------------+
         |                         |
         |                         |
  +------v------+         +--------v-------+
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
